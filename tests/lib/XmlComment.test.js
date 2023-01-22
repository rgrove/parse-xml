/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { parseXml, XmlComment, XmlNode } = require('../..');

describe('XmlComment', () => {
  it("isn't emitted by default", () => {
    let { root } = parseXml(`<root><!-- I'm a comment! --></root>`);
    assert.strictEqual(root.children.length, 0);
  });

  it('is emitted when `options.preserveComments` is `true`', () => {
    let { root } = parseXml(`<root><!-- I'm a comment! --></root>`, { preserveComments: true });
    assert(root.children[0] instanceof XmlComment);
  });

  it('can be serialized to JSON', () => {
    let { root } = parseXml(`<root><!-- I'm a comment! --></root>`, { preserveComments: true });
    assert.strictEqual(JSON.stringify(root.children[0]), `{"type":"comment","content":"I'm a comment!"}`);
  });

  describe('constructor', () => {
    it("defaults `content` to an empty string if it's not provided", () => {
      let comment = new XmlComment();
      assert.strictEqual(comment.content, '');
    });
  });

  describe('content', () => {
    it('is the content of the comment', () => {
      let { root } = parseXml(`<root><!-- I'm a comment! --></root>`, { preserveComments: true });
      assert.strictEqual(root.children[0].content, "I'm a comment!");
    });
  });

  describe('when `options.includeOffsets` is `false`', () => {
    describe('start', () => {
      it('is `-1`', () => {
        let { root } = parseXml(`<root><!-- I'm a comment! --></root>`, { preserveComments: true });
        assert.strictEqual(root.children[0].start, -1);
      });
    });

    describe('end', () => {
      it('is `-1`', () => {
        let { root } = parseXml(`<root><!-- I'm a comment! --></root>`, { preserveComments: true });
        assert.strictEqual(root.children[0].end, -1);
      });
    });
  });

  describe('when `options.includeOffsets` is `true`', () => {
    describe('start', () => {
      it('is the starting byte offset of the comment', () => {
        let { root } = parseXml(`<root><!-- I'm a comment! --></root>`, { includeOffsets: true, preserveComments: true });
        assert.strictEqual(root.children[0].start, 6);
      });
    });

    describe('end', () => {
      it('is the ending byte offset of the comment', () => {
        let { root } = parseXml(`<root><!-- I'm a comment! --></root>`, { includeOffsets: true, preserveComments: true });
        assert.strictEqual(root.children[0].end, 29);
      });
    });
  });

  describe('parent', () => {
    it('is the parent node', () => {
      let { root } = parseXml(`<root><!-- I'm a comment! --></root>`, { preserveComments: true });
      assert.strictEqual(root.children[0].parent, root);
    });
  });

  describe('type', () => {
    it('is `XmlNode.TYPE_COMMENT`', () => {
      let { root } = parseXml(`<root><!-- I'm a comment! --></root>`, { preserveComments: true });
      let [ node ] = root.children;
      assert.strictEqual(node.type, XmlNode.TYPE_COMMENT);
    });
  });
});
