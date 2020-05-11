'use strict';

const XmlNode = require('./XmlNode');

/**
A processing instruction within an XML document.

@public
*/
class XmlProcessingInstruction extends XmlNode {
  /**
  @param {string} name
  @param {string} [content]
  */
  constructor(name, content = '') {
    super();

    /**
    Name of this processing instruction. Also sometimes referred to as the
    processing instruction "target".

    @type {string}
    @public
    */
    this.name = name;

    /**
    Content of this processing instruction.

    @type {string}
    @public
    */
    this.content = content;
  }

  get type() {
    return XmlNode.TYPE_PROCESSING_INSTRUCTION;
  }

  toJSON() {
    return Object.assign(XmlNode.prototype.toJSON.call(this), {
      name: this.name,
      content: this.content
    });
  }
}

module.exports = XmlProcessingInstruction;
