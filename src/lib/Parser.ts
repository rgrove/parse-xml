import { StringScanner } from './StringScanner.js';
import * as syntax from './syntax.js';
import { XmlCdata } from './XmlCdata.js';
import { XmlComment } from './XmlComment.js';
import { XmlDocument } from './XmlDocument.js';
import { XmlElement } from './XmlElement.js';
import { XmlProcessingInstruction } from './XmlProcessingInstruction.js';
import { XmlText } from './XmlText.js';

import type { XmlNode } from './XmlNode.js';


const emptyString = '';

/**
 * Parses an XML string into an `XmlDocument`.
 *
 * @private
 */
export class Parser {
  readonly document: XmlDocument;

  private currentNode: XmlDocument | XmlElement;
  private readonly options: ParserOptions;
  private readonly scanner: StringScanner;

  /**
   * @param xml XML string to parse.
   * @param options Parser options.
   */
  constructor(xml: string, options: ParserOptions = {}) {
    this.document = new XmlDocument();
    this.currentNode = this.document;
    this.options = options;
    this.scanner = new StringScanner(normalizeXmlString(xml));

    this.consumeProlog();

    if (!this.consumeElement()) {
      throw this.error('Root element is missing or invalid');
    }

    while (this.consumeMisc()) {} // eslint-disable-line no-empty

    if (!this.scanner.isEnd) {
      throw this.error('Extra content at the end of the document');
    }
  }

  /**
   * Adds the given `XmlNode` as a child of `this.currentNode`.
   */
  addNode(node: XmlNode) {
    node.parent = this.currentNode;

    // @ts-expect-error: XmlDocument has a more limited set of possible children
    // than XmlElement so TypeScript is unhappy, but we always do the right
    // thing.
    this.currentNode.children.push(node);
  }

  /**
   * Adds the given _text_ to the document, either by appending it to a
   * preceding `XmlText` node (if possible) or by creating a new `XmlText` node.
   */
  addText(text: string) {
    let { children } = this.currentNode;
    let { length } = children;

    if (length > 0) {
      let prevNode = children[length - 1];

      if (prevNode instanceof XmlText) {
        // The previous node is a text node, so we can append to it and avoid
        // creating another node.
        prevNode.text += text;
        return;
      }
    }

    this.addNode(new XmlText(text));
  }

  /**
   * Consumes element attributes.
   *
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-starttags
   */
  consumeAttributes(): Record<string, string> {
    let attributes = Object.create(null);

    while (this.consumeWhitespace()) {
      let attrName = this.consumeName();

      if (!attrName) {
        break;
      }

      let attrValue = this.consumeEqual() && this.consumeAttributeValue();

      if (attrValue === false) {
        throw this.error('Attribute value expected');
      }

      if (attrName in attributes) {
        throw this.error(`Duplicate attribute: ${attrName}`);
      }

      if (attrName === 'xml:space'
          && attrValue !== 'default'
          && attrValue !== 'preserve') {

        throw this.error('Value of the `xml:space` attribute must be "default" or "preserve"');
      }

      attributes[attrName] = attrValue;
    }

    if (this.options.sortAttributes) {
      let attrNames = Object.keys(attributes).sort();
      let sortedAttributes = Object.create(null);

      for (let i = 0; i < attrNames.length; ++i) {
        let attrName = attrNames[i] as string;
        sortedAttributes[attrName] = attributes[attrName];
      }

      attributes = sortedAttributes;
    }

    return attributes;
  }

  /**
   * Consumes an `AttValue` (attribute value) if possible.
   *
   * @returns
   *   Contents of the `AttValue` minus quotes, or `false` if nothing was
   *   consumed. An empty string indicates that an `AttValue` was consumed but
   *   was empty.
   *
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-AttValue
   */
  consumeAttributeValue(): string | false {
    let { scanner } = this;
    let quote = scanner.peek();

    if (quote !== '"' && quote !== "'") {
      return false;
    }

    scanner.advance();

    let chars;
    let isClosed = false;
    let value = emptyString;
    let regex = quote === '"'
      ? syntax.attValueCharDoubleQuote
      : syntax.attValueCharSingleQuote;

    matchLoop: while (!scanner.isEnd) {
      chars = scanner.consumeMatch(regex);

      if (chars) {
        this.validateChars(chars);
        value += chars.replace(syntax.attValueNormalizedWhitespace, ' ');
      }

      switch (scanner.peek()) {
        case quote:
          isClosed = true;
          break matchLoop;

        case '&':
          value += this.consumeReference();
          continue;

        case '<':
          throw this.error('Unescaped `<` is not allowed in an attribute value');

        case emptyString:
          break matchLoop;
      }
    }

    if (!isClosed) {
      throw this.error('Unclosed attribute');
    }

    scanner.advance();
    return value;
  }

  /**
   * Consumes a CDATA section if possible.
   *
   * @returns Whether a CDATA section was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-cdata-sect
   */
  consumeCdataSection(): boolean {
    let { scanner } = this;

    if (!scanner.consumeStringFast('<![CDATA[')) {
      return false;
    }

    let text = scanner.consumeUntilString(']]>');
    this.validateChars(text);

    if (!scanner.consumeStringFast(']]>')) {
      throw this.error('Unclosed CDATA section');
    }

    if (this.options.preserveCdata) {
      this.addNode(new XmlCdata(text));
    } else {
      this.addText(text);
    }

    return true;
  }

  /**
   * Consumes character data if possible.
   *
   * @returns Whether character data was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#dt-chardata
   */
  consumeCharData(): boolean {
    let { scanner } = this;
    let charData = scanner.consumeUntilMatch(syntax.endCharData);

    if (!charData) {
      return false;
    }

    this.validateChars(charData);

    if (scanner.peek(3) === ']]>') {
      throw this.error('Element content may not contain the CDATA section close delimiter `]]>`');
    }

    this.addText(charData);
    return true;
  }

  /**
   * Consumes a comment if possible.
   *
   * @returns Whether a comment was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Comment
   */
  consumeComment(): boolean {
    let { scanner } = this;

    if (!scanner.consumeStringFast('<!--')) {
      return false;
    }

    let content = scanner.consumeUntilString('--');
    this.validateChars(content);

    if (!scanner.consumeStringFast('-->')) {
      if (scanner.peek(2) === '--') {
        throw this.error("The string `--` isn't allowed inside a comment");
      }

      throw this.error('Unclosed comment');
    }

    if (this.options.preserveComments) {
      this.addNode(new XmlComment(content.trim()));
    }

    return true;
  }

  /**
   * Consumes a reference in a content context if possible.
   *
   * This differs from `consumeReference()` in that a consumed reference will be
   * added to the document as a text node instead of returned.
   *
   * @returns Whether a reference was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#entproc
   */
  consumeContentReference(): boolean {
    let ref = this.consumeReference();

    if (ref) {
      this.addText(ref);
      return true;
    }

    return false;
  }

  /**
   * Consumes a doctype declaration if possible.
   *
   * This is a loose implementation since doctype declarations are currently
   * discarded without further parsing.
   *
   * @returns Whether a doctype declaration was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#dtd
   */
  consumeDoctypeDeclaration(): boolean {
    let { scanner } = this;

    if (!scanner.consumeStringFast('<!DOCTYPE')
        || !this.consumeWhitespace()) {

      return false;
    }

    scanner.consumeMatch(/[^[>]+/y);

    if (scanner.consumeMatch(/\[[\s\S]+?\][\x20\t\r\n]*>/y)) {
      return true;
    }

    if (!scanner.consumeStringFast('>')) {
      throw this.error('Unclosed doctype declaration');
    }

    return true;
  }

  /**
   * Consumes an element if possible.
   *
   * @returns Whether an element was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-element
   */
  consumeElement(): boolean {
    let { scanner } = this;
    let mark = scanner.charIndex;

    if (!scanner.consumeStringFast('<')) {
      return false;
    }

    let name = this.consumeName();

    if (!name) {
      scanner.reset(mark);
      return false;
    }

    let attributes = this.consumeAttributes();
    let isEmpty = Boolean(scanner.consumeStringFast('/>'));
    let element = new XmlElement(name, attributes);

    element.parent = this.currentNode;

    if (!isEmpty) {
      if (!scanner.consumeStringFast('>')) {
        throw this.error(`Unclosed start tag for element \`${name}\``);
      }

      this.currentNode = element;

      do {
        this.consumeCharData();
      } while (
        this.consumeElement()
          || this.consumeContentReference()
          || this.consumeCdataSection()
          || this.consumeProcessingInstruction()
          || this.consumeComment()
      );

      let endTagMark = scanner.charIndex;
      let endTagName;

      if (!scanner.consumeStringFast('</')
          || !(endTagName = this.consumeName())
          || endTagName !== name) {

        scanner.reset(endTagMark);
        throw this.error(`Missing end tag for element ${name}`);
      }

      this.consumeWhitespace();

      if (!scanner.consumeStringFast('>')) {
        throw this.error(`Unclosed end tag for element ${name}`);
      }

      this.currentNode = element.parent;
    }

    this.addNode(element);
    return true;
  }

  /**
   * Consumes an `Eq` production if possible.
   *
   * @returns Whether an `Eq` production was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Eq
   */
  consumeEqual(): boolean {
    this.consumeWhitespace();

    if (this.scanner.consumeStringFast('=')) {
      this.consumeWhitespace();
      return true;
    }

    return false;
  }

  /**
   * Consumes `Misc` content if possible.
   *
   * @returns Whether anything was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Misc
   */
  consumeMisc(): boolean {
    return this.consumeComment()
      || this.consumeProcessingInstruction()
      || this.consumeWhitespace();
  }

  /**
   * Consumes one or more `Name` characters if possible.
   *
   * @returns `Name` characters, or an empty string if none were consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Name
   */
  consumeName(): string {
    return syntax.isNameStartChar(this.scanner.peek())
      ? this.scanner.consumeMatchFn(syntax.isNameChar)
      : emptyString;
  }

  /**
   * Consumes a processing instruction if possible.
   *
   * @returns Whether a processing instruction was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-pi
   */
  consumeProcessingInstruction(): boolean {
    let { scanner } = this;
    let mark = scanner.charIndex;

    if (!scanner.consumeStringFast('<?')) {
      return false;
    }

    let name = this.consumeName();

    if (name) {
      if (name.toLowerCase() === 'xml') {
        scanner.reset(mark);
        throw this.error("XML declaration isn't allowed here");
      }
    } else {
      throw this.error('Invalid processing instruction');
    }

    if (!this.consumeWhitespace()) {
      if (scanner.consumeStringFast('?>')) {
        this.addNode(new XmlProcessingInstruction(name));
        return true;
      }

      throw this.error('Whitespace is required after a processing instruction name');
    }

    let content = scanner.consumeUntilString('?>');
    this.validateChars(content);

    if (!scanner.consumeStringFast('?>')) {
      throw this.error('Unterminated processing instruction');
    }

    this.addNode(new XmlProcessingInstruction(name, content));
    return true;
  }

  /**
   * Consumes a prolog if possible.
   *
   * @returns Whether a prolog was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-prolog-dtd
   */
  consumeProlog(): boolean {
    let { scanner } = this;
    let mark = scanner.charIndex;

    this.consumeXmlDeclaration();

    while (this.consumeMisc()) {} // eslint-disable-line no-empty

    if (this.consumeDoctypeDeclaration()) {
      while (this.consumeMisc()) {} // eslint-disable-line no-empty
    }

    return mark < scanner.charIndex;
  }

  /**
   * Consumes a reference if possible.
   *
   * This differs from `consumeContentReference()` in that a consumed reference
   * will be returned rather than added to the document.
   *
   * @returns
   *   Parsed reference value, or `false` if nothing was consumed (to
   *   distinguish from a reference that resolves to an empty string).
   *
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Reference
   */
  consumeReference(): string | false {
    let { scanner } = this;

    if (!scanner.consumeStringFast('&')) {
      return false;
    }

    let ref = scanner.consumeMatchFn(syntax.isReferenceChar);

    if (scanner.consume() !== ';') {
      throw this.error('Unterminated reference (a reference must end with `;`)');
    }

    let parsedValue;

    if (ref[0] === '#') {
      // This is a character reference.
      let codePoint = ref[1] === 'x'
        ? parseInt(ref.slice(2), 16) // Hex codepoint.
        : parseInt(ref.slice(1), 10); // Decimal codepoint.

      if (isNaN(codePoint)) {
        throw this.error('Invalid character reference');
      }

      if (!syntax.isXmlCodePoint(codePoint)) {
        throw this.error('Character reference resolves to an invalid character');
      }

      parsedValue = String.fromCodePoint(codePoint);
    } else {
      // This is an entity reference.
      parsedValue = syntax.predefinedEntities[ref];

      if (parsedValue === undefined) {
        let {
          ignoreUndefinedEntities,
          resolveUndefinedEntity,
        } = this.options;

        let wrappedRef = `&${ref};`; // for backcompat with <= 2.x

        if (resolveUndefinedEntity) {
          let resolvedValue = resolveUndefinedEntity(wrappedRef);

          if (resolvedValue !== null && resolvedValue !== undefined) {
            let type = typeof resolvedValue;

            if (type !== 'string') {
              throw new TypeError(`\`resolveUndefinedEntity()\` must return a string, \`null\`, or \`undefined\`, but returned a value of type ${type}`);
            }

            return resolvedValue;
          }
        }

        if (ignoreUndefinedEntities) {
          return wrappedRef;
        }

        scanner.reset(-wrappedRef.length);
        throw this.error(`Named entity isn't defined: ${wrappedRef}`);
      }
    }

    return parsedValue;
  }

  /**
   * Consumes a `SystemLiteral` if possible.
   *
   * A `SystemLiteral` is similar to an attribute value, but allows the
   * characters `<` and `&` and doesn't replace references.
   *
   * @returns
   *   Value of the `SystemLiteral` minus quotes, or `false` if nothing was
   *   consumed. An empty string indicates that a `SystemLiteral` was consumed
   *   but was empty.
   *
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-SystemLiteral
   */
  consumeSystemLiteral(): string | false {
    let { scanner } = this;
    let quote = scanner.consumeStringFast('"') || scanner.consumeStringFast("'");

    if (!quote) {
      return false;
    }

    let value = scanner.consumeUntilString(quote);
    this.validateChars(value);

    if (!scanner.consumeStringFast(quote)) {
      throw this.error('Missing end quote');
    }

    return value;
  }

  /**
   * Consumes one or more whitespace characters if possible.
   *
   * @returns Whether any whitespace characters were consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#white
   */
  consumeWhitespace(): boolean {
    return Boolean(this.scanner.consumeMatchFn(syntax.isWhitespace));
  }

  /**
   * Consumes an XML declaration if possible.
   *
   * @returns Whether an XML declaration was consumed.
   * @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-XMLDecl
   */
  consumeXmlDeclaration(): boolean {
    let { scanner } = this;

    if (!scanner.consumeStringFast('<?xml')) {
      return false;
    }

    if (!this.consumeWhitespace()) {
      throw this.error('Invalid XML declaration');
    }

    let version = Boolean(scanner.consumeStringFast('version'))
      && this.consumeEqual()
      && this.consumeSystemLiteral();

    if (version === false) {
      throw this.error('XML version is missing or invalid');
    } else if (!/^1\.[0-9]+$/.test(version)) {
      throw this.error('Invalid character in version number');
    }

    if (this.consumeWhitespace()) {
      let encoding = Boolean(scanner.consumeStringFast('encoding'))
        && this.consumeEqual()
        && this.consumeSystemLiteral();

      if (encoding) {
        this.consumeWhitespace();
      }

      let standalone = Boolean(scanner.consumeStringFast('standalone'))
        && this.consumeEqual()
        && this.consumeSystemLiteral();

      if (standalone) {
        if (standalone !== 'yes' && standalone !== 'no') {
          throw this.error('Only "yes" and "no" are permitted as values of `standalone`');
        }

        this.consumeWhitespace();
      }
    }

    if (!scanner.consumeStringFast('?>')) {
      throw this.error('Invalid or unclosed XML declaration');
    }

    return true;
  }

  /**
   * Throws an error at the current scanner position.
   */
  error(message: string) {
    let { charIndex, string: xml } = this.scanner;
    let column = 1;
    let excerpt = '';
    let line = 1;

    // Find the line and column where the error occurred.
    for (let i = 0; i < charIndex; ++i) {
      let char = xml[i];

      if (char === '\n') {
        column = 1;
        excerpt = '';
        line += 1;
      } else {
        column += 1;
        excerpt += char;
      }
    }

    let eol = xml.indexOf('\n', charIndex);

    excerpt += eol === -1
      ? xml.slice(charIndex)
      : xml.slice(charIndex, eol);

    let excerptStart = 0;

    // Keep the excerpt below 50 chars, but always keep the error position in
    // view.
    if (excerpt.length > 50) {
      if (column < 40) {
        excerpt = excerpt.slice(0, 50);
      } else {
        excerptStart = column - 20;
        excerpt = excerpt.slice(excerptStart, column + 30);
      }
    }

    let err = new Error(
      `${message} (line ${line}, column ${column})\n`
        + `  ${excerpt}\n`
        + ' '.repeat(column - excerptStart + 1) + '^\n',
    );

    Object.assign(err, {
      column,
      excerpt,
      line,
      pos: charIndex,
    });

    return err;
  }

  /**
   * Throws an invalid character error if any character in the given _string_
   * isn't a valid XML character.
   */
  validateChars(string: string) {
    let { length } = string;

    for (let i = 0; i < length; ++i) {
      let cp = string.codePointAt(i) as number;

      if (!syntax.isXmlCodePoint(cp)) {
        this.scanner.reset(-([ ...string ].length - i));
        throw this.error('Invalid character');
      }

      if (cp > 65535) {
        i += 1;
      }
    }
  }
}

// -- Private Functions --------------------------------------------------------

/**
 * Normalizes the given XML string by stripping a byte order mark (if present)
 * and replacing CRLF sequences and lone CR characters with LF characters.
 */
function normalizeXmlString(xml: string): string {
  if (xml[0] === '\uFEFF') {
    xml = xml.slice(1);
  }

  return xml.replace(/\r\n?/g, '\n');
}

// -- Types --------------------------------------------------------------------
export type ParserOptions = {
  /**
   * When `true`, an undefined named entity (like "&bogus;") will be left in the
   * output as is instead of causing a parse error.
   *
   * @default false
   */
  ignoreUndefinedEntities?: boolean;

  /**
   * When `true`, CDATA sections will be preserved in the document as `XmlCdata`
   * nodes. Otherwise CDATA sections will be represented as `XmlText` nodes,
   * which keeps the node tree simpler and easier to work with.
   *
   * @default false
   */
  preserveCdata?: boolean;

  /**
   * When `true`, comments will be preserved in the document as `XmlComment`
   * nodes. Otherwise comments will not be included in the node tree.
   *
   * @default false
   */
  preserveComments?: boolean;

  /**
   * When an undefined named entity is encountered, this function will be called
   * with the entity as its only argument. It should return a string value with
   * which to replace the entity, or `null` or `undefined` to treat the entity
   * as undefined (which may result in a parse error depending on the value of
   * `ignoreUndefinedEntities`).
   */
  resolveUndefinedEntity?: (entity: string) => string | null | undefined;

  /**
   * When `true`, attributes in an element's `attributes` object will be sorted
   * in alphanumeric order by name. Otherwise they'll retain their original
   * order as found in the XML.
   *
   * @default false
   */
  sortAttributes?: boolean;
};
