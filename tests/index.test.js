/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { parseXml, XmlCdata, XmlComment, XmlDeclaration, XmlDocument, XmlElement, XmlNode, XmlProcessingInstruction, XmlText } = require('..');

it('exports XML node classes', () => {
  assert.equal(typeof XmlCdata, 'function');
  assert.equal(typeof XmlComment, 'function');
  assert.equal(typeof XmlDeclaration, 'function');
  assert.equal(typeof XmlDocument, 'function');
  assert.equal(typeof XmlElement, 'function');
  assert.equal(typeof XmlNode, 'function');
  assert.equal(typeof XmlProcessingInstruction, 'function');
  assert.equal(typeof XmlText, 'function');
});

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
});
