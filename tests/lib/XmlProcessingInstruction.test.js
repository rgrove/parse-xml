/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { parseXml, XmlNode, XmlProcessingInstruction } = require('../..');

describe('XmlProcessingInstruction', () => {
  it('is emitted by the parser', () => {
    let { root } = parseXml('<root><?xml-stylesheet type="text/xsl" href="style.xsl"?></root>');
    assert(root.children[0] instanceof XmlProcessingInstruction);
  });

  it('can be serialized to JSON', () => {
    let { root } = parseXml('<root><?xml-stylesheet type="text/xsl" href="style.xsl"?></root>');
    assert.strictEqual(JSON.stringify(root.children[0]), `{"type":"pi","name":"xml-stylesheet","content":"type=\\"text/xsl\\" href=\\"style.xsl\\""}`);
  });

  describe('constructor', () => {
    it('defaults the value of `content` to an empty string if not provided', () => {
      let pi = new XmlProcessingInstruction('foo');
      assert.strictEqual(pi.content, '');
    });
  });

  describe('document', () => {
    it('is the document', () => {
      let doc = parseXml('<root><?foo?></root>');
      assert.strictEqual(doc.root.children[0].document, doc);
    });
  });

  describe('parent', () => {
    it('is the parent element', () => {
      let { root } = parseXml('<root><?foo?></root>');
      assert.strictEqual(root.children[0].parent, root);
    });
  });

  describe('type', () => {
    it('is `XmlNode.TYPE_PROCESSING_INSTRUCTION`', () => {
      let { root } = parseXml('<root><?foo?></root>');
      assert.strictEqual(root.children[0].type, XmlNode.TYPE_PROCESSING_INSTRUCTION);
    });
  });
});
