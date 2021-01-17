'use strict';

/**
Base interface for a node in an XML document.

@public
*/
class XmlNode {
  constructor() {
    /**
    Parent node of this node, or `null` if this node has no parent.

    @type {XmlDocument|XmlElement|null}
    @public
    */
    this.parent = null;
  }

  /**
  Document that contains this node, or `null` if this node is not associated
  with a document.

  @type {XmlDocument?}
  @public
  */
  get document() {
    return this.parent
      ? this.parent.document
      : null;
  }

  /**
  Whether this node is the root node of the document.

  @returns {boolean}
  @public
  */
  get isRootNode() {
    return this.parent
      ? this.parent === this.document
      : false;
  }

  /**
  Whether whitespace should be preserved in the content of this element and
  its children.

  This is influenced by the value of the special `xml:space` attribute, and
  will be `true` for any node whose `xml:space` attribute is set to
  "preserve". If a node has no such attribute, it will inherit the value of
  the nearest ancestor that does (if any).

  @type {boolean}
  @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-white-space
  @public
  */
  get preserveWhitespace() {
    return Boolean(this.parent && this.parent.preserveWhitespace);
  }

  /**
  Type of this node.

  The value of this property is a string that matches one of the static `TYPE_*`
  properties on the `XmlNode` class (e.g. `TYPE_ELEMENT`, `TYPE_TEXT`, etc.).

  The `XmlNode` class itself is a base class and doesn't have its own type name.

  @type {string}
  @public
  */
  get type() {
    return '';
  }

  /**
  Returns a JSON-serializable object representing this node, minus properties
  that could result in circular references.

  @returns {{[key: string]: any}}
  @public
  */
  toJSON() {
    /** @type {{[key: string]: any}} */
    let json = {
      type: this.type
    };

    if (this.isRootNode) {
      json.isRootNode = true;
    }

    if (this.preserveWhitespace) {
      json.preserveWhitespace = true;
    }

    return json;
  }
}

/**
Type value for an `XmlCdata` node.

@type {string}
@public
*/
XmlNode.TYPE_CDATA = 'cdata';

/**
Type value for an `XmlComment` node.

@type {string}
@public
*/
XmlNode.TYPE_COMMENT = 'comment';

/**
Type value for an `XmlDocument` node.

@type {string}
@public
*/
XmlNode.TYPE_DOCUMENT = 'document';

/**
Type value for an `XmlElement` node.

@type {string}
@public
*/
XmlNode.TYPE_ELEMENT = 'element';

/**
Type value for an `XmlProcessingInstruction` node.

@type {string}
@public
*/
XmlNode.TYPE_PROCESSING_INSTRUCTION = 'pi';

/**
Type value for an `XmlText` node.

@type {string}
@public
*/
XmlNode.TYPE_TEXT = 'text';

module.exports = XmlNode;

/** @typedef {import('./XmlDocument')} XmlDocument */
/** @typedef {import('./XmlElement')} XmlElement */
