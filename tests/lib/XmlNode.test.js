/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { XmlNode } = require('../..');

describe('XmlNode', () => {
  describe('document', () => {
    describe('when the node is not associated with a document', () => {
      it('is `null`', () => {
        let node = new XmlNode();
        assert.strictEqual(node.document, null);
      });
    });
  });

  describe('toJSON()', () => {
    describe('when `offset` is `-1`', () => {
      it('doesn\'t include an `offset` property', () => {
        let node = new XmlNode();
        assert.strictEqual(node.toJSON().offset, undefined);
      });
    });

    describe('when `offset` is greater than -1', () => {
      it('includes an `offset` property', () => {
        let node = new XmlNode();
        node.offset = 0;
        assert.strictEqual(node.toJSON().offset, 0);
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
