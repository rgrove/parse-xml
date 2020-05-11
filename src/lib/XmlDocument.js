'use strict';

const XmlElement = require('./XmlElement');
const XmlNode = require('./XmlNode');

/**
Represents an XML document. All elements within the document are descendants of
this node.

@public
*/
class XmlDocument extends XmlNode {
  /**
  @param {Array<XmlComment|XmlElement|XmlProcessingInstruction>} [children]
  */
  constructor(children = []) {
    super();

    /**
    Child nodes of this document.

    @type {Array<XmlComment|XmlElement|XmlProcessingInstruction>}
    @public
    */
    this.children = children;
  }

  get document() {
    return this;
  }

  /**
  Root element of this document, or `null` if this document is empty.

  @type {XmlElement?}
  @public
  */
  get root() {
    // @ts-ignore
    return this.children.find((child) => child instanceof XmlElement) || null;
  }

  /**
  Text content of this document and all its descendants.

  @type {string}
  @public
  */
  get text() {
    return this.children
      .map(child => 'text' in child ? child.text : '')
      .join('');
  }

  get type() {
    return XmlNode.TYPE_DOCUMENT;
  }

  toJSON() {
    return Object.assign(XmlNode.prototype.toJSON.call(this), {
      children: this.children.map(child => child.toJSON()),
    });
  }
}

module.exports = XmlDocument;

/** @typedef {import('./XmlComment')} XmlComment */
/** @typedef {import('./XmlProcessingInstruction')} XmlProcessingInstruction */
