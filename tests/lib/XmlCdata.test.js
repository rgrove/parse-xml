/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { parseXml, XmlCdata, XmlNode } = require('../..');

describe('XmlCdata', () => {
  let xml;

  beforeEach(() => {
    xml = `<root><![CDATA[ 1 + 2 < 2 + 2 ]]></root>`;
  });

  it("isn't emitted by default", () => {
    let [ node ] = parseXml(xml).root.children;
    assert.strictEqual(node.type, XmlNode.TYPE_TEXT);
  });

  it('is emitted when `options.preserveCdata` is `true`', () => {
    let { root } = parseXml(xml, { preserveCdata: true });
    let [ node ] = root.children;

    assert(node instanceof XmlCdata);
    assert.strictEqual(node.text, ' 1 + 2 < 2 + 2 ');
    assert.strictEqual(node.parent, root);
  });

  describe('when `options.includeOffsets` is `false`', () => {
    describe('start', () => {
      it('is `-1`', () => {
        let { root } = parseXml(xml, { preserveCdata: true });
        assert.strictEqual(root.children[0].start, -1);
      });
    });

    describe('end', () => {
      it('is `-1`', () => {
        let { root } = parseXml(xml, { preserveCdata: true });
        assert.strictEqual(root.children[0].end, -1);
      });
    });
  });

  describe('when `options.includeOffsets` is `true`', () => {
    describe('start', () => {
      it('is the starting byte offset of the CDATA section', () => {
        let { root } = parseXml(xml, { includeOffsets: true, preserveCdata: true });
        assert.strictEqual(root.children[0].start, 6);
      });
    });

    describe('end', () => {
      it('is the ending byte offset of the CDATA section', () => {
        let { root } = parseXml(xml, { includeOffsets: true, preserveCdata: true });
        assert.strictEqual(root.children[0].end, 33);
      });
    });
  });

  describe('type', () => {
    it('is `XmlNode.TYPE_CDATA`', () => {
      let { root } = parseXml(xml, { preserveCdata: true });
      assert.strictEqual(root.children[0].type, XmlNode.TYPE_CDATA);
    });
  });
});
