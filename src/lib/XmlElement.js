'use strict';

const XmlNode = require('./XmlNode');

/**
Element in an XML document.

@public
*/
class XmlElement extends XmlNode {
  /**
  @param {string} name
  @param {{[attrName: string]: string}} [attributes]
  @param {Array<XmlCdata|XmlComment|XmlElement|XmlProcessingInstruction|XmlText>} [children]
  */
  constructor(name, attributes = Object.create(null), children = []) {
    super();

    /**
    Name of this element.

    @type {string}
    @public
    */
    this.name = name;

    /**
    Attributes on this element.

    @type {{[attrName: string]: string}}
    @public
    */
    this.attributes = attributes;

    /**
    Child nodes of this element.

    @type {Array<XmlCdata|XmlComment|XmlElement|XmlProcessingInstruction|XmlText>}
    @public
    */
    this.children = children;
  }

  /**
  Whether this node is empty (meaning it has no children).

  @type {boolean}
  @public
  */
  get isEmpty() {
    return this.children.length === 0;
  }

  /** @type {boolean} */
  get preserveWhitespace() {
    /** @type {XmlNode?} */
    let node = this;

    while (node instanceof XmlElement) {
      if ('xml:space' in node.attributes) {
        return node.attributes['xml:space'] === 'preserve';
      }

      node = node.parent;
    }

    return false;
  }

  /**
  Text content of this element and all its descendants.

  @type {string}
  @public
  */
  get text() {
    return this.children
      .map(child => 'text' in child ? child.text : '')
      .join('');
  }

  get type() {
    return XmlNode.TYPE_ELEMENT;
  }

  /** @returns {{[key: string]: any}} */
  toJSON() {
    return Object.assign(XmlNode.prototype.toJSON.call(this), {
      name: this.name,
      attributes: this.attributes,
      children: this.children.map(child => child.toJSON()),
    });
  }
}

module.exports = XmlElement;

/** @typedef {import('./XmlCdata')} XmlCdata */
/** @typedef {import('./XmlComment')} XmlComment */
/** @typedef {import('./XmlProcessingInstruction')} XmlProcessingInstruction */
/** @typedef {import('./XmlText')} XmlText */
