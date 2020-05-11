'use strict';

const emptyString = '';

/**
@private
*/
class StringScanner {
  /**
  @param {string} string
  */
  constructor(string) {
    /** @type {string[]} */
    this.chars = [ ...string ];

    /** @type {number[]} */
    this.charsToBytes = [];

    /** @type {number} */
    this.charCount = this.chars.length;

    /** @type {number} */
    this.charIndex = 0;

    /** @type {string} */
    this.string = string;

    // Create a mapping of character indexes to byte indexes. If the string
    // contains multi-byte characters, a byte index may not necessarily align
    // with a character index.
    for (let byteIndex = 0, charIndex = 0; charIndex < this.charCount; ++charIndex) {
      this.charsToBytes.push(byteIndex);
      byteIndex += this.chars[charIndex].length;
    }
  }

  /**
  Whether the current character index is at the end of the input string.

  @type {boolean}
  */
  get isEnd() {
    return this.charIndex >= this.charCount;
  }

  /**
  Advances the scanner by the given number of characters, stopping if the end of
  the string is reached.

  @param {number} [count]
  */
  advance(count = 1) {
    this.charIndex = Math.min(this.charCount, this.charIndex + count);
  }

  /**
  Consumes and returns the given number of characters if possible, advancing the
  scanner and stopping if the end of the string is reached.

  If no characters could be consumed, an empty string will be returned.

  @param {number} [count]
  @returns {string}
  */
  consume(count = 1) {
    let chars = this.peek(count);
    this.advance(count);
    return chars;
  }

  /**
  Consumes a match for the given regex if possible, advances the scanner, and
  returns the matching string (or an empty string if nothing was consumed).

  The regex must be anchored to the start of the string.

  @param {RegExp} regex
  @returns {string}
  */
  consumeMatch(regex) {
    let { charIndex, charsToBytes, string } = this;

    let matches = string
      .slice(charsToBytes[charIndex])
      .match(regex);

    if (matches === null) {
      return emptyString;
    }

    let [ match ] = matches;
    this.advance(charLength(match));
    return match;
  }

  /**
  Consumes the given string if it exists at the current character index, and
  advances the scanner.

  If the given string doesn't exist at the current character index, an empty
  string will be returned and the scanner will not be advanced.

  Note: For performance reasons, this method doesn't support consuming strings
  that contain multi-byte characters (but the parser doesn't need it to).

  @param {string} string
  @returns {string}
  */
  consumeString(string) {
    let { length } = string;

    // Using `peek(1)` to check if the first character of a longer string
    // matches improves performance by avoiding a more expensive multi-char
    // `peek()` call when it wouldn't be useful.
    if ((length === 1 || this.peek(1) === string[0])
        && this.peek(length) === string) {

      this.advance(length);
      return string;
    }

    return emptyString;
  }

  /**
  Consumes characters until the given regex is matched, advancing the scanner up
  to (but not beyond) the beginning of the match.

  Returns the consumed string, or an empty string if nothing was consumed.

  @param {RegExp} regex
  @returns {string}
  */
  consumeUntilMatch(regex) {
    let { charIndex, charsToBytes, string } = this;
    let stringSlice = string.slice(charsToBytes[charIndex]);
    let matchIndex = stringSlice.search(regex);

    if (matchIndex <= 0) {
      return emptyString;
    }

    let result = stringSlice.slice(0, matchIndex);
    this.advance(charLength(result));
    return result;
  }

  /**
  Consumes characters until the given string is found, advancing the scanner up
  to (but not beyond) that point.

  Returns the consumed string, or an empty string if nothing was consumed.

  @param {string} searchString
  @returns {string}
  */
  consumeUntilString(searchString) {
    let { charIndex, charsToBytes, string } = this;
    let byteIndex = charsToBytes[charIndex];
    let matchByteIndex = string.indexOf(searchString, byteIndex);

    if (matchByteIndex <= 0) {
      return emptyString;
    }

    let result = string.slice(byteIndex, matchByteIndex);
    this.advance(charLength(result));
    return result;
  }

  /**
  Returns a string consisting of the characters between the given character
  index and the current scanner position.

  @param {number} startIndex
  @returns {string}
  */
  getStringFromIndex(startIndex) {
    let { charsToBytes, charIndex, string } = this;

    return startIndex < charIndex
      ? string.slice(charsToBytes[startIndex], charsToBytes[charIndex])
      : emptyString;
  }

  /**
  Returns the given number of characters starting at the current character
  index, without advancing the scanner and without exceeding the end of the
  input string.

  @param {number} [count]
  @returns {string}
  */
  peek(count = 1) {
    if (count === 1) {
      return this.chars[this.charIndex] || emptyString;
    }

    let { charsToBytes, charIndex, string } = this;
    return string.slice(charsToBytes[charIndex], charsToBytes[charIndex + count]);
  }

  /**
  Resets the scanner position to the given character _index_, or to the start of
  the input string if no index is given.

  If _index_ is negative, the scanner position will be moved backward by that
  many characters, stopping if the beginning of the string is reached.

  @param {number} [index]
  */
  reset(index = 0) {
    this.charIndex = index > 0
      ? index
      : Math.max(0, this.charIndex + index);
  }
}

module.exports = StringScanner;

// -- Private Functions --------------------------------------------------------

/**
Returns the number of characters in the given _string_, which may differ from
the byte length if the string contains multi-byte characters.

@param {string} string
@returns {number}
*/
function charLength(string) {
  let { length } = string;

  // We could get the char length with `[ ...string ].length`, but that's
  // actually slower than this approach, which replaces surrogate pairs with
  // single-byte characters.
  return length <= 1
    ? length
    : string.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '_').length;
}
