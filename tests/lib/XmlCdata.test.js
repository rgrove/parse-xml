/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../../src');

const { XmlCdata, XmlNode } = parseXml;

describe('`XmlCdata`', () => {
  let options;
  let xml;

  beforeEach(() => {
    options = {};
    xml = `<root><![CDATA[ 1 + 2 < 2 + 2 ]]></root>`;
  });

  it("isn't emitted by default", () => {
    let [ node ] = parseXml(xml).root.children;
    assert.strictEqual(node.type, XmlNode.TYPE_TEXT);
  });

  describe('when `options.preserveCdata` is `true`', () => {
    beforeEach(() => {
      options.preserveCdata = true;
    });

    it('is emitted', () => {
      let { root } = parseXml(xml, options);
      let [ node ] = root.children;

      assert(node instanceof XmlCdata);
      assert.strictEqual(node.text, ' 1 + 2 < 2 + 2 ');
      assert.strictEqual(node.parent, root);
    });

    it('has the correct type value', () => {
      let { root } = parseXml(xml, options);
      let [ node ] = root.children;
      assert.strictEqual(node.type, XmlNode.TYPE_CDATA);
    });
  });
});
