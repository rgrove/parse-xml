/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { parseXml, XmlDeclaration, XmlNode } = require('../..');

describe('XmlDeclaration', () => {
  let xml;

  beforeEach(() => {
    xml = `<?xml version="1.0"?><root />`;
  });

  it("isn't emitted by default", () => {
    let doc = parseXml(xml);
    assert.strictEqual(doc.children.length, 1);
    assert.strictEqual(doc.children[0].type, XmlNode.TYPE_ELEMENT);
  });

  it('is emitted when `options.preserveXmlDeclaration` is `true`', () => {
    let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;
    assert(node instanceof XmlDeclaration);
  });

  it('may be instantiated without `encoding` or `standalone` arguments', () => {
    let node = new XmlDeclaration('1.0');
    assert.strictEqual(node.version, '1.0');
    assert.strictEqual(node.encoding, null);
    assert.strictEqual(node.standalone, null);
  });

  describe('encoding', () => {
    describe('when no encoding is specified', () => {
      it('is `null`', () => {
        let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;
        assert.strictEqual(node.encoding, null);
      });
    });

    describe('when an encoding is specified', () => {
      beforeEach(() => {
        xml = `<?xml version="1.0" encoding="UTF-8"?><root />`;
      });

      it('is the encoding of the XML declaration', () => {
        let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;
        assert.strictEqual(node.encoding, 'UTF-8');
      });
    });
  });

  describe('standalone', () => {
    describe('when not specified', () => {
      it('is `null`', () => {
        let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;
        assert.strictEqual(node.standalone, null);
      });
    });

    describe('when specified', () => {
      beforeEach(() => {
        xml = `<?xml version="1.0" standalone="yes"?><root />`;
      });

      it('is the value of the standalone declaration', () => {
        let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;
        assert.strictEqual(node.standalone, 'yes');
      });
    });
  });

  describe('toJSON()', () => {
    it('returns a serializable object representation of the XML declaration', () => {
      let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;

      assert.deepStrictEqual(node.toJSON(), {
        type: XmlNode.TYPE_XML_DECLARATION,
        version: '1.0',
      });
    });

    it('includes `encoding` and `standalone` when specified', () => {
      xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root />`;

      let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;

      assert.deepStrictEqual(node.toJSON(), {
        type: XmlNode.TYPE_XML_DECLARATION,
        version: '1.0',
        encoding: 'UTF-8',
        standalone: 'yes',
      });
    });
  });

  describe('type', () => {
    it('is `XmlNode.TYPE_XML_DECLARATION`', () => {
      let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;
      assert.strictEqual(node.type, XmlNode.TYPE_XML_DECLARATION);
    });
  });

  describe('version', () => {
    it('is the version of the XML declaration', () => {
      let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;
      assert.strictEqual(node.version, '1.0');
    });
  });

  describe('when `options.includeOffsets` is `false`', () => {
    describe('start', () => {
      it('is `-1`', () => {
        let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;
        assert.strictEqual(node.start, -1);
      });
    });

    describe('end', () => {
      it('is `-1`', () => {
        let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;
        assert.strictEqual(node.end, -1);
      });
    });
  });

  describe('when `options.includeOffsets` is `true`', () => {
    describe('start', () => {
      it('is the starting byte offset of the XML declaration', () => {
        let [ node ] = parseXml(xml, { includeOffsets: true, preserveXmlDeclaration: true }).children;
        assert.strictEqual(node.start, 0);
      });
    });

    describe('end', () => {
      it('is the ending byte offset of the XML declaration', () => {
        let [ node ] = parseXml(xml, { includeOffsets: true, preserveXmlDeclaration: true }).children;
        assert.strictEqual(node.end, 21);
      });
    });
  });
});
