const emptyString = '';
const surrogatePair = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

/** @private */
export class StringScanner {
  charIndex: number;
  readonly string: string;

  private readonly charCount: number;
  private readonly charsToBytes: number[] | undefined;
  private readonly length: number;
  private readonly multiByteMode: boolean;

  constructor(string: string) {
    this.charCount = this.charLength(string, true);
    this.charIndex = 0;
    this.length = string.length;
    this.multiByteMode = this.charCount !== this.length;
    this.string = string;

    if (this.multiByteMode) {
      let charsToBytes = [];

      // Create a mapping of character indexes to byte indexes. Since the string
      // contains multibyte characters, a byte index may not necessarily align
      // with a character index.
      for (let byteIndex = 0, charIndex = 0; charIndex < this.charCount; ++charIndex) {
        charsToBytes[charIndex] = byteIndex;
        byteIndex += (string.codePointAt(byteIndex) as number) > 65535 ? 2 : 1;
      }

      this.charsToBytes = charsToBytes;
    }
  }

  /**
   * Whether the current character index is at the end of the input string.
   */
  get isEnd() {
    return this.charIndex >= this.charCount;
  }

  // -- Protected Methods ------------------------------------------------------

  /**
   * Returns the byte index of the given character index in the string. The two
   * may differ in strings that contain multibyte characters.
   */
  protected charIndexToByteIndex(charIndex: number = this.charIndex): number {
    return this.multiByteMode
      ? (this.charsToBytes as number[])[charIndex] ?? Infinity
      : charIndex;
  }

  /**
   * Returns the number of characters in the given string, which may differ from
   * the byte length if the string contains multibyte characters.
   */
  protected charLength(string: string, multiByteSafe = this.multiByteMode): number {
    // We could get the char length with `[ ...string ].length`, but that's
    // actually slower than replacing surrogate pairs with single-byte
    // characters and then counting the result.
    return multiByteSafe
      ? string.replace(surrogatePair, '_').length
      : string.length;
  }

  // -- Public Methods ---------------------------------------------------------

  /**
   * Advances the scanner by the given number of characters, stopping if the end
   * of the string is reached.
   */
  advance(count = 1) {
    this.charIndex = Math.min(this.charCount, this.charIndex + count);
  }

  /**
   * Consumes and returns the given number of characters if possible, advancing
   * the scanner and stopping if the end of the string is reached.
   *
   * If no characters could be consumed, an empty string will be returned.
   */
  consume(count = 1): string {
    let chars = this.peek(count);
    this.advance(count);
    return chars;
  }

  /**
   * Consumes a match for the given sticky regex, advances the scanner, updates
   * the `lastIndex` property of the regex, and returns the matching string.
   *
   * The regex must have a sticky flag ("y") so that its `lastIndex` prop can be
   * used to anchor the match at the current scanner position.
   *
   * Returns the consumed string, or an empty string if nothing was consumed.
   */
  consumeMatch(regex: RegExp): string {
    if (!regex.sticky) {
      throw new Error('`regex` must have a sticky flag ("y")');
    }

    regex.lastIndex = this.charIndexToByteIndex();

    let result = regex.exec(this.string);

    if (result === null || result.length === 0) {
      return emptyString;
    }

    let match = result[0] as string;
    this.advance(this.charLength(match));
    return match;
  }

  /**
   * Consumes and returns all characters for which the given function returns a
   * truthy value, stopping on the first falsy return value or if the end of the
   * input is reached.
   */
  consumeMatchFn(fn: (char: string) => boolean): string {
    let char;
    let match = emptyString;

    while ((char = this.peek()) && fn(char)) {
      match += char;
      this.advance();
    }

    return match;
  }

  /**
   * Consumes the given string if it exists at the current character index, and
   * advances the scanner.
   *
   * If the given string doesn't exist at the current character index, an empty
   * string will be returned and the scanner will not be advanced.
   */
  consumeString(stringToConsume: string): string {
    if (this.consumeStringFast(stringToConsume)) {
      return stringToConsume;
    }

    if (this.multiByteMode) {
      let { length } = stringToConsume;
      let charLengthToMatch = this.charLength(stringToConsume);

      if (charLengthToMatch !== length
          && stringToConsume === this.peek(charLengthToMatch)) {

        this.advance(charLengthToMatch);
        return stringToConsume;
      }
    }

    return emptyString;
  }

  /**
   * Does the same thing as `consumeString()`, but doesn't support consuming
   * multibyte characters. This can be faster if you only need to match single
   * byte characters.
   */
  consumeStringFast(stringToConsume: string): string {
    let { length } = stringToConsume;

    if (this.peek(length) === stringToConsume) {
      this.advance(length);
      return stringToConsume;
    }

    return emptyString;
  }

  /**
   * Consumes characters until the given global regex is matched, advancing the
   * scanner up to (but not beyond) the beginning of the match. If the regex
   * doesn't match, nothing will be consumed.
   *
   * Returns the consumed string, or an empty string if nothing was consumed.
   */
  consumeUntilMatch(regex: RegExp): string {
    let restOfString = this.string.slice(this.charIndexToByteIndex());
    let matchByteIndex = restOfString.search(regex);

    if (matchByteIndex <= 0) {
      return emptyString;
    }

    let result = restOfString.slice(0, matchByteIndex);
    this.advance(this.charLength(result));
    return result;
  }

  /**
   * Consumes characters until the given string is found, advancing the scanner
   * up to (but not beyond) that point. If the string is never found, nothing
   * will be consumed.
   *
   * Returns the consumed string, or an empty string if nothing was consumed.
   */
  consumeUntilString(searchString: string): string {
    let { string } = this;
    let byteIndex = this.charIndexToByteIndex();
    let matchByteIndex = string.indexOf(searchString, byteIndex);

    if (matchByteIndex <= 0) {
      return emptyString;
    }

    let result = string.slice(byteIndex, matchByteIndex);
    this.advance(this.charLength(result));
    return result;
  }

  /**
   * Returns the given number of characters starting at the current character
   * index, without advancing the scanner and without exceeding the end of the
   * input string.
   */
  peek(count = 1): string {
    let { charIndex, multiByteMode, string } = this;

    if (multiByteMode) {
      // Inlining this comparison instead of checking `this.isEnd` improves perf
      // slightly since `peek()` is called so frequently.
      if (charIndex >= this.charCount) {
        return emptyString;
      }

      return string.slice(
        this.charIndexToByteIndex(charIndex),
        this.charIndexToByteIndex(charIndex + count),
      );
    }

    return string.slice(charIndex, charIndex + count);
  }

  /**
   * Resets the scanner position to the given character _index_, or to the start
   * of the input string if no index is given.
   *
   * If _index_ is negative, the scanner position will be moved backward by that
   * many characters, stopping if the beginning of the string is reached.
   */
  reset(index = 0) {
    this.charIndex = index >= 0
      ? Math.min(this.charCount, index)
      : Math.max(0, this.charIndex + index);
  }
}
