'use strict';

const XmlNode = require('./XmlNode');

/**
A comment within an XML document.

@public
*/
class XmlComment extends XmlNode {
  /**
  @param {string} [content]
  */
  constructor(content = '') {
    super();

    /**
    Content of this comment.

    @type {string}
    @public
    */
    this.content = content;
  }

  get type() {
    return XmlNode.TYPE_COMMENT;
  }

  toJSON() {
    return Object.assign(XmlNode.prototype.toJSON.call(this), {
      content: this.content
    });
  }
}

module.exports = XmlComment;
