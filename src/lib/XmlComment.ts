import { XmlNode } from './XmlNode.js';

/**
 * A comment within an XML document.
 *
 * @public
 */
export class XmlComment extends XmlNode {
  content: string;

  constructor(content = '') {
    super();

    /**
     * Content of this comment.
     *
     * @type {string}
     * @public
     */
    this.content = content;
  }

  override get type() {
    return XmlNode.TYPE_COMMENT;
  }

  override toJSON() {
    return Object.assign(XmlNode.prototype.toJSON.call(this), {
      content: this.content,
    });
  }
}
