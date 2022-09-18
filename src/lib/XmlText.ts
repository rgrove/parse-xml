import { XmlNode } from './XmlNode.js';

/**
 * Text content within an XML document.
 *
 * @public
 */
export class XmlText extends XmlNode {
  /**
   * Text content of this node.
   *
   * @public
   */
  text: string;

  constructor(text = '') {
    super();
    this.text = text;
  }

  override get type() {
    return XmlNode.TYPE_TEXT;
  }

  override toJSON() {
    return Object.assign(XmlNode.prototype.toJSON.call(this), {
      text: this.text,
    });
  }
}
