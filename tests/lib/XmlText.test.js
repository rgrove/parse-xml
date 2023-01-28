/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { parseXml, XmlNode, XmlText } = require('../..');

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

  describe('when `options.includeOffsets` is `false`', () => {
    describe('start', () => {
      it('is `-1`', () => {
        let { root } = parseXml('<root> foo &amp; bar\r\nbaz </root>');
        assert.strictEqual(root.children[0].start, -1);
      });
    });

    describe('end', () => {
      it('is `-1`', () => {
        let { root } = parseXml('<root> foo &amp; bar\r\nbaz </root>');
        assert.strictEqual(root.children[0].end, -1);
      });
    });
  });

  describe('when `options.includeOffsets` is `true`', () => {
    describe('start', () => {
      it('is the starting byte offset of the text node', () => {
        let { root } = parseXml('<root> foo </root>', { includeOffsets: true });
        assert.strictEqual(root.children[0].start, 6);
      });
    });

    describe('end', () => {
      it('is the ending byte offset of the text node', () => {
        let { root } = parseXml('<root> foo </root>', { includeOffsets: true });
        assert.strictEqual(root.children[0].end, 11);
      });

      it('is correct after multiple text nodes have been merged', () => {
        let { root } = parseXml('<root>one&amp;two<!-- comment -->three</root>', { includeOffsets: true });
        assert.strictEqual(root.children[0].end, 38);
      });
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
