'use strict';

const XmlNode = require('./XmlNode');

/**
Text content within an XML document.

@public
*/
class XmlText extends XmlNode {
  /**
  @param {string} [text]
  */
  constructor(text = '') {
    super();

    /**
    Text content of this node.

    @type {string}
    @public
    */
    this.text = text;
  }

  get type() {
    return XmlNode.TYPE_TEXT;
  }

  toJSON() {
    return Object.assign(XmlNode.prototype.toJSON.call(this), {
      text: this.text
    });
  }
}

module.exports = XmlText;
