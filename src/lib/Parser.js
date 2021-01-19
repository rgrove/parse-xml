'use strict';

const StringScanner = require('./StringScanner');
const syntax = require('./syntax');
const XmlCdata = require('./XmlCdata');
const XmlComment = require('./XmlComment');
const XmlDocument = require('./XmlDocument');
const XmlElement = require('./XmlElement');
const XmlProcessingInstruction = require('./XmlProcessingInstruction');
const XmlText = require('./XmlText');

const emptyString = '';

/**
Parses an XML string into an `XmlDocument`.

@private
*/
class Parser {
  /**
  @param {string} xml
    XML string to parse.

  @param {object} [options]
    Parsing options.

    @param {boolean} [options.ignoreUndefinedEntities=false]
    @param {boolean} [options.preserveCdata=false]
    @param {boolean} [options.preserveComments=false]
    @param {(entity: string) => string?} [options.resolveUndefinedEntity]
    @param {boolean} [options.sortAttributes=false]
  */
  constructor(xml, options = {}) {
    /** @type {XmlDocument} */
    this.document = new XmlDocument();

    /** @type {XmlDocument|XmlElement} */
    this.currentNode = this.document;

    this.options = options;
    this.scanner = new StringScanner(normalizeXmlString(xml));

    this.consumeProlog();

    if (!this.consumeElement()) {
      this.error('Root element is missing or invalid');
    }

    while (this.consumeMisc()) {} // eslint-disable-line no-empty

    if (!this.scanner.isEnd) {
      this.error('Extra content at the end of the document');
    }
  }

  /**
  Adds the given `XmlNode` as a child of `this.currentNode`.

  @param {XmlNode} node
  */
  addNode(node) {
    node.parent = this.currentNode;

    // @ts-ignore
    this.currentNode.children.push(node);
  }

  /**
  Adds the given _text_ to the document, either by appending it to a preceding
  `XmlText` node (if possible) or by creating a new `XmlText` node.

  @param {string} text
  */
  addText(text) {
    let { children } = this.currentNode;

    if (children.length > 0) {
      let prevNode = children[children.length - 1];

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
  Consumes an `AttValue` (attribute value) if possible.

  @returns {string|false}
    Contents of the `AttValue` minus quotes, or `false` if nothing was consumed.
    An empty string indicates that an `AttValue` was consumed but was empty.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-AttValue
  */
  consumeAttributeValue() {
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
      ? /[^"&<]+/y
      : /[^'&<]+/y;

    matchLoop: while (!scanner.isEnd) {
      chars = scanner.consumeMatch(regex);

      if (chars) {
        this.validateChars(chars);
        value += chars.replace(/[\t\r\n]/g, ' ');
      }

      let nextChar = scanner.peek();

      switch (nextChar) {
        case quote:
          isClosed = true;
          break matchLoop;

        case '&':
          value += this.consumeReference();
          continue;

        case '<':
          this.error('Unescaped `<` is not allowed in an attribute value'); /* istanbul ignore next */
          break;

        case emptyString:
          this.error('Unclosed attribute'); /* istanbul ignore next */
          break;

      }
    }

    if (!isClosed) {
      this.error('Unclosed attribute');
    }

    scanner.advance();
    return value;
  }

  /**
  Consumes a CDATA section if possible.

  @returns {boolean}
    Whether a CDATA section was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-cdata-sect
  */
  consumeCdataSection() {
    let { scanner } = this;

    if (!scanner.consumeStringFast('<![CDATA[')) {
      return false;
    }

    let text = scanner.consumeUntilString(']]>');
    this.validateChars(text);

    if (!scanner.consumeStringFast(']]>')) {
      this.error('Unclosed CDATA section');
    }

    if (this.options.preserveCdata) {
      this.addNode(new XmlCdata(text));
    } else {
      this.addText(text);
    }

    return true;
  }

  /**
  Consumes character data if possible.

  @returns {boolean}
    Whether character data was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#dt-chardata
  */
  consumeCharData() {
    let { scanner } = this;
    let charData = scanner.consumeUntilMatch(/<|&|]]>/g);

    if (!charData) {
      return false;
    }

    this.validateChars(charData);

    if (scanner.peek() === ']' && scanner.peek(3) === ']]>') {
      this.error('Element content may not contain the CDATA section close delimiter `]]>`');
    }

    this.addText(charData);
    return true;
  }

  /**
  Consumes a comment if possible.

  @returns {boolean}
    Whether a comment was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Comment
  */
  consumeComment() {
    let { scanner } = this;

    if (!scanner.consumeStringFast('<!--')) {
      return false;
    }

    let content = scanner.consumeUntilString('--');
    this.validateChars(content);

    if (!scanner.consumeStringFast('-->')) {
      if (scanner.peek(2) === '--') {
        this.error("The string `--` isn't allowed inside a comment");
      } else {
        this.error('Unclosed comment');
      }
    }

    if (this.options.preserveComments) {
      this.addNode(new XmlComment(content.trim()));
    }

    return true;
  }

  /**
  Consumes a reference in a content context if possible.

  This differs from `consumeReference()` in that a consumed reference will be
  added to the document as a text node instead of returned.

  @returns {boolean}
    Whether a reference was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#entproc
  */
  consumeContentReference() {
    let ref = this.consumeReference();

    if (ref) {
      this.addText(ref);
      return true;
    }

    return false;
  }

  /**
  Consumes a doctype declaration if possible.

  This is a loose implementation since doctype declarations are currently
  discarded without further parsing.

  @returns {boolean}
    Whether a doctype declaration was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#dtd
  */
  consumeDoctypeDeclaration() {
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
      this.error('Unclosed doctype declaration');
    }

    return true;
  }

  /**
  Consumes an element if possible.

  @returns {boolean}
    Whether an element was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-element
  */
  consumeElement() {
    let { scanner } = this;
    let mark = scanner.charIndex;

    if (scanner.peek() !== '<') {
      return false;
    }

    scanner.advance();
    let name = this.consumeName();

    if (!name) {
      scanner.reset(mark);
      return false;
    }

    let attributes = Object.create(null);

    while (this.consumeWhitespace()) {
      let attrName = this.consumeName();

      if (!attrName) {
        continue;
      }

      let attrValue = this.consumeEqual()
        && this.consumeAttributeValue();

      if (attrValue === false) {
        this.error('Attribute value expected');
      }

      if (attrName in attributes) {
        this.error(`Duplicate attribute: ${attrName}`);
      }

      if (attrName === 'xml:space'
          && attrValue !== 'default'
          && attrValue !== 'preserve') {

        this.error('Value of the `xml:space` attribute must be "default" or "preserve"');
      }

      attributes[attrName] = attrValue;
    }

    if (this.options.sortAttributes) {
      let attrNames = Object.keys(attributes).sort();
      let sortedAttributes = Object.create(null);

      for (let i = 0; i < attrNames.length; ++i) {
        let attrName = attrNames[i];
        sortedAttributes[attrName] = attributes[attrName];
      }

      attributes = sortedAttributes;
    }

    let isEmpty = Boolean(scanner.consumeStringFast('/>'));
    let element = new XmlElement(name, attributes);

    element.parent = this.currentNode;

    if (!isEmpty) {
      if (!scanner.consumeStringFast('>')) {
        this.error(`Unclosed start tag for element \`${name}\``);
      }

      this.currentNode = element;
      this.consumeCharData();

      while (
        this.consumeElement()
          || this.consumeContentReference()
          || this.consumeCdataSection()
          || this.consumeProcessingInstruction()
          || this.consumeComment()
      ) {
        this.consumeCharData();
      }

      let endTagMark = scanner.charIndex;
      let endTagName;

      if (!scanner.consumeStringFast('</')
          || !(endTagName = this.consumeName())
          || endTagName !== name) {

        scanner.reset(endTagMark);
        this.error(`Missing end tag for element ${name}`);
      }

      this.consumeWhitespace();

      if (!scanner.consumeStringFast('>')) {
        this.error(`Unclosed end tag for element ${name}`);
      }

      this.currentNode = element.parent;
    }

    this.addNode(element);
    return true;
  }

  /**
  Consumes an `Eq` production if possible.

  @returns {boolean}
    Whether an `Eq` production was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Eq
  */
  consumeEqual() {
    this.consumeWhitespace();

    if (this.scanner.consumeStringFast('=')) {
      this.consumeWhitespace();
      return true;
    }

    return false;
  }

  /**
  Consumes `Misc` content if possible.

  @returns {boolean}
    Whether anything was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Misc
  */
  consumeMisc() {
    return this.consumeComment()
      || this.consumeProcessingInstruction()
      || this.consumeWhitespace();
  }

  /**
  Consumes one or more `Name` characters if possible.

  @returns {string}
    `Name` characters, or an empty string if none were consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Name
  */
  consumeName() {
    return syntax.isNameStartChar(this.scanner.peek())
      ? this.scanner.consumeMatchFn(syntax.isNameChar)
      : emptyString;
  }

  /**
  Consumes a processing instruction if possible.

  @returns {boolean}
    Whether a processing instruction was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-pi
  */
  consumeProcessingInstruction() {
    let { scanner } = this;
    let mark = scanner.charIndex;

    if (!scanner.consumeStringFast('<?')) {
      return false;
    }

    let name = this.consumeName();

    if (name) {
      if (name.toLowerCase() === 'xml') {
        scanner.reset(mark);
        this.error("XML declaration isn't allowed here");
      }
    } else {
      this.error('Invalid processing instruction');
    }

    if (!this.consumeWhitespace()) {
      if (scanner.consumeStringFast('?>')) {
        this.addNode(new XmlProcessingInstruction(name));
        return true;
      }

      this.error('Whitespace is required after a processing instruction name');
    }

    let content = scanner.consumeUntilString('?>');
    this.validateChars(content);

    if (!scanner.consumeStringFast('?>')) {
      this.error('Unterminated processing instruction');
    }

    this.addNode(new XmlProcessingInstruction(name, content));
    return true;
  }

  /**
  Consumes a prolog if possible.

  @returns {boolean}
    Whether a prolog was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-prolog-dtd
  */
  consumeProlog() {
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
  Consumes a reference if possible.

  This differs from `consumeContentReference()` in that a consumed reference
  will be returned rather than added to the document.

  @returns {string|false}
    Parsed reference value, or `false` if nothing was consumed (to distinguish
    from a reference that resolves to an empty string).

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Reference
  */
  consumeReference() {
    let { scanner } = this;

    if (scanner.peek() !== '&') {
      return false;
    }

    scanner.advance();

    let ref = scanner.consumeMatchFn(syntax.isReferenceChar);

    if (scanner.consume() !== ';') {
      this.error('Unterminated reference (a reference must end with `;`)');
    }

    let parsedValue;

    if (ref[0] === '#') {
      // This is a character reference.
      let codePoint = ref[1] === 'x'
        ? parseInt(ref.slice(2), 16) // Hex codepoint.
        : parseInt(ref.slice(1), 10); // Decimal codepoint.

      if (isNaN(codePoint)) {
        this.error('Invalid character reference');
      }

      parsedValue = String.fromCodePoint(codePoint);

      if (!syntax.isXmlChar(parsedValue)) {
        this.error('Character reference resolves to an invalid character');
      }
    } else {
      // This is an entity reference.
      parsedValue = syntax.predefinedEntities[ref];

      if (parsedValue === undefined) {
        let {
          ignoreUndefinedEntities,
          resolveUndefinedEntity
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
        this.error(`Named entity isn't defined: ${wrappedRef}`);
      }
    }

    return parsedValue;
  }

  /**
  Consumes a `SystemLiteral` if possible.

  A `SystemLiteral` is similar to an attribute value, but allows the characters
  `<` and `&` and doesn't replace references.

  @returns {string|false}
    Value of the `SystemLiteral` minus quotes, or `false` if nothing was
    consumed. An empty string indicates that a `SystemLiteral` was consumed but
    was empty.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-SystemLiteral
  */
  consumeSystemLiteral() {
    let { scanner } = this;
    let quote = scanner.consumeStringFast('"') || scanner.consumeStringFast("'");

    if (!quote) {
      return false;
    }

    let value = scanner.consumeUntilString(quote);
    this.validateChars(value);

    if (!scanner.consumeStringFast(quote)) {
      this.error('Missing end quote');
    }

    return value;
  }

  /**
  Consumes one or more whitespace characters if possible.

  @returns {boolean}
    Whether any whitespace characters were consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#white
  */
  consumeWhitespace() {
    return Boolean(this.scanner.consumeMatchFn(syntax.isWhitespace));
  }

  /**
  Consumes an XML declaration if possible.

  @returns {boolean}
    Whether an XML declaration was consumed.

  @see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-XMLDecl
  */
  consumeXmlDeclaration() {
    let { scanner } = this;

    if (!scanner.consumeStringFast('<?xml')) {
      return false;
    }

    if (!this.consumeWhitespace()) {
      this.error('Invalid XML declaration');
    }

    let version = Boolean(scanner.consumeStringFast('version'))
      && this.consumeEqual()
      && this.consumeSystemLiteral();

    if (version === false) {
      this.error('XML version is missing or invalid');
    } else if (!/^1\.[0-9]+$/.test(version)) {
      this.error('Invalid character in version number');
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
          this.error('Only "yes" and "no" are permitted as values of `standalone`');
        }

        this.consumeWhitespace();
      }
    }

    if (!scanner.consumeStringFast('?>')) {
      this.error('Invalid or unclosed XML declaration');
    }

    return true;
  }

  /**
  Throws an error at the current scanner position.

  @param {string} message
  */
  error(message) {
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
        + ' '.repeat(column - excerptStart + 1) + '^\n'
    );

    Object.assign(err, {
      column,
      excerpt,
      line,
      pos: charIndex
    });

    throw err;
  }

  /**
  Throws an invalid character error if any character in the given _string_ isn't
  a valid XML character.

  @param {string} string
  */
  validateChars(string) {
    let charIndex = 0;

    for (let char of string) {
      if (syntax.isNotXmlChar(char)) {
        this.scanner.reset(-([ ...string ].length - charIndex));
        this.error('Invalid character');
      }

      charIndex += 1;
    }
  }
}

module.exports = Parser;

// -- Private Functions --------------------------------------------------------

/**
Normalizes the given XML string by stripping a byte order mark (if present) and
replacing CRLF sequences and lone CR characters with LF characters.

@param {string} xml
@returns {string}
*/
function normalizeXmlString(xml) {
  if (xml[0] === '\uFEFF') {
    xml = xml.slice(1);
  }

  return xml.replace(/\r\n?/g, '\n');
}

/** @typedef {import('./XmlNode')} XmlNode */
