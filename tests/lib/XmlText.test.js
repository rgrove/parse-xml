/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../../src');

const { XmlNode, XmlText } = parseXml;

describe('XmlText', () => {
  it('is emitted by the parser', () => {
    let { root } = parseXml('<root>hello there</root>');
    assert(root.children[0] instanceof XmlText);
  });

  it('can be serialized to JSON', () => {
    let { root } = parseXml('<root> foo &amp;  bar\r\nbaz </root>');
    assert.strictEqual(JSON.stringify(root.children[0]), '{"type":"text","text":" foo &  bar\\nbaz "}');
  });

  describe('constructor', () => {
    it('defaults `text` to an empty string if not provided', () => {
      let textNode = new XmlText();
      assert.strictEqual(textNode.text, '');
    });
  });

  describe('text', () => {
    it('is the text content of the text node', () => {
      let { root } = parseXml('<root> foo &amp;  bar\r\nbaz </root>');
      assert.strictEqual(root.children[0].text, ' foo &  bar\nbaz ');
    });
  });

  describe('type', () => {
    it('is `XmlNode.TYPE_TEXT`', () => {
      let { root } = parseXml('<root>hi</root>');
      assert.strictEqual(root.children[0].type, XmlNode.TYPE_TEXT);
    });
  });
});
