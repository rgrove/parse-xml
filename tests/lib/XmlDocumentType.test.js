/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { parseXml, XmlDocumentType, XmlNode } = require('../..');

describe('XmlDocumentType', () => {
  let xml;

  beforeEach(() => {
    xml = `
      <!DOCTYPE kittens>
      <kittens />
    `;
  });

  it("isn't emitted by default", () => {
    let doc = parseXml(xml);
    assert.strictEqual(doc.children.length, 1);
    assert.strictEqual(doc.children[0].type, XmlNode.TYPE_ELEMENT);
  });

  it('is emitted when `options.preserveDocumentType` is `true`', () => {
    let [ node ] = parseXml(xml, { preserveDocumentType: true }).children;
    assert(node instanceof XmlDocumentType);
  });

  describe('toJSON()', () => {
    it('returns a serializable object representation of the document type', () => {
      let [ node ] = parseXml(xml, { preserveDocumentType: true }).children;

      assert.deepStrictEqual(node.toJSON(), {
        type: XmlNode.TYPE_DOCUMENT_TYPE,
        name: 'kittens',
      });
    });

    it("includes `publicId`,  `systemId`, and `internalSubset` when they aren't null", () => {
      xml = `
        <!DOCTYPE kittens PUBLIC "kittens!" "kittens.dtd" [
          <!ELEMENT kittens (#PCDATA)>
        ]>
        <kittens />
      `;

      // Find the initial indentation of the doctype so we can match it in the
      // assertion.
      let indent = xml.match(/^\n*(\s*)/, '$1')[1];

      let [ node ] = parseXml(xml, { preserveDocumentType: true }).children;

      assert.deepStrictEqual(node.toJSON(), {
        type: XmlNode.TYPE_DOCUMENT_TYPE,
        name: 'kittens',
        publicId: 'kittens!',
        systemId: 'kittens.dtd',
        internalSubset: `\n${indent}  <!ELEMENT kittens (#PCDATA)>\n${indent}`,
      });
    });
  });

  describe('type', () => {
    it('is `XmlNode.TYPE_DOCUMENT_TYPE`', () => {
      let [ node ] = parseXml(xml, { preserveDocumentType: true }).children;
      assert.strictEqual(node.type, XmlNode.TYPE_DOCUMENT_TYPE);
    });
  });

  describe('when `options.includeOffsets` is `false`', () => {
    describe('start', () => {
      it('is `-1`', () => {
        let [ node ] = parseXml(xml, { preserveDocumentType: true }).children;
        assert.strictEqual(node.start, -1);
      });
    });

    describe('end', () => {
      it('is `-1`', () => {
        let [ node ] = parseXml(xml, { preserveDocumentType: true }).children;
        assert.strictEqual(node.end, -1);
      });
    });
  });

  describe('when `options.includeOffsets` is `true`', () => {
    describe('start', () => {
      it('is the starting byte offset of the document type', () => {
        let [ node ] = parseXml(xml, { includeOffsets: true, preserveDocumentType: true }).children;
        assert.strictEqual(node.start, 7);
      });
    });

    describe('end', () => {
      it('is the ending byte offset of the document type', () => {
        let [ node ] = parseXml(xml, { includeOffsets: true, preserveDocumentType: true }).children;
        assert.strictEqual(node.end, 25);
      });
    });
  });
});
