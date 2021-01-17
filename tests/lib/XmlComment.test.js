/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../../src');

const { XmlComment, XmlNode } = parseXml;

describe('`XmlComment`', () => {
  let options;
  let xml;

  beforeEach(() => {
    options = {};
    xml = `<root><!-- I'm a comment! --></root>`;
  });

  it("isn't emitted by default", () => {
    let { root } = parseXml(xml);
    assert.strictEqual(root.children.length, 0);
  });

  describe('when `options.preserveComments` is `true`', () => {
    beforeEach(() => {
      options = { preserveComments: true };
    });

    it('is emitted', () => {
      let { root } = parseXml(xml, options);
      let [ node ] = root.children;

      assert(node instanceof XmlComment);
      assert.strictEqual(node.content, "I'm a comment!");
      assert.strictEqual(node.parent, root);
    });

    it('has the correct type value', () => {
      let { root } = parseXml(xml, options);
      let [ node ] = root.children;
      assert.strictEqual(node.type, XmlNode.TYPE_COMMENT);
    });

    it('can be serialized to JSON', () => {
      let { root } = parseXml(xml, options);
      let [ node ] = root.children;
      assert.strictEqual(JSON.stringify(node), `{"type":"comment","content":"I'm a comment!"}`);
    });
  });
});
