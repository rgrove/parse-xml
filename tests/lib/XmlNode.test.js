/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../../src');

const { XmlNode } = parseXml;

describe('XmlNode', () => {
  describe('document', () => {
    describe('when the node is not associated with a document', () => {
      it('is `null`', () => {
        let node = new XmlNode();
        assert.strictEqual(node.document, null);
      });
    });
  });

  describe('type', () => {
    it('is an empty string', () => {
      let node = new XmlNode();
      assert.strictEqual(node.type, '');
    });
  });
});
