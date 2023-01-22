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
    describe('when `start` is `-1`', () => {
      it('doesn\'t include the `start` or `end` properties', () => {
        let json = new XmlNode().toJSON();
        assert.strictEqual(json.start, undefined);
        assert.strictEqual(json.end, undefined);
      });
    });

    describe('when `start` is greater than -1', () => {
      it('includes the `start` and `end` properties', () => {
        let node = new XmlNode();
        node.start = 0;
        node.end = 3;

        let json = node.toJSON();
        assert.strictEqual(json.start, 0);
        assert.strictEqual(json.end, 3);
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
