/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../../src');

const { XmlDocument, XmlNode } = parseXml;

describe('`XmlDocument`', () => {
  describe('is emitted by the parser', () => {
    assert(parseXml('<root />') instanceof XmlDocument);
  });

  describe('can be serialized to JSON', () => {
    assert.strictEqual(JSON.stringify(parseXml('<root />')), '{"type":"document","children":[{"type":"element","isRootNode":true,"name":"root","attributes":{},"children":[]}]}');
  });

  describe('constructor', () => {
    it("defaults `children` to an empty array if it's not provided", () => {
      let doc = new XmlDocument();
      assert.deepStrictEqual(doc.children, []);
    });
  });

  describe('`document`', () => {
    it('is the XmlDocument instance itself', () => {
      let doc = parseXml('<root />');
      assert.strictEqual(doc.document, doc);
    });
  });

  describe('`parent`', () => {
    it('is `null`', () => {
      assert.strictEqual(parseXml('<root />').parent, null);
    });
  });

  describe('`root`', () => {
    it('is the root element of the document', () => {
      let doc = parseXml('<root />');
      assert.strictEqual(doc.root.type, XmlNode.TYPE_ELEMENT);
      assert.strictEqual(doc.root.name, 'root');
    });

    describe('when the document is empty', () => {
      it('is `null`', () => {
        let doc = new XmlDocument();
        assert.strictEqual(doc.root, null);
      });
    });
  });

  describe('`text`', () => {
    it('is the text content of the document and all its descendants', () => {
      assert.strictEqual(parseXml('<a><b><c>hello</c></b> there!</a>').text, 'hello there!');
      assert.strictEqual(parseXml('<!-- hi --><a/><!-- hi -->', { preserveComments: true }).text, '');
    });
  });

  describe('`type`', () => {
    it('is `XmlNode.TYPE_DOCUMENT`', () => {
      assert.strictEqual(parseXml('<root />').type, XmlNode.TYPE_DOCUMENT);
    });
  });
});
