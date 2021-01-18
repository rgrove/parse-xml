/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../src');

const { XmlDocument, XmlElement, XmlNode } = parseXml;

describe('parseXml()', () => {
  it('parses an XML string and returns an `XmlDocument`', () => {
    let doc = parseXml('<root />');

    assert(doc instanceof XmlDocument);
    assert.strictEqual(doc.children.length, 1);
    assert(doc.root instanceof XmlElement);
    assert.strictEqual(doc.root.name, 'root');
  });

  it('passes `options` to the parser', () => {
    let doc = parseXml('<!-- hi --><root />', { preserveComments: true });
    assert.strictEqual(doc.children[0].type, XmlNode.TYPE_COMMENT);
  });

  it('includes static references to all XML node classes', () => {
    assert(parseXml.XmlCdata);
    assert(parseXml.XmlComment);
    assert(parseXml.XmlDocument);
    assert(parseXml.XmlElement);
    assert(parseXml.XmlNode);
    assert(parseXml.XmlProcessingInstruction);
    assert(parseXml.XmlText);
  });
});
