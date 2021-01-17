/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../../src');

const { XmlElement, XmlText } = parseXml;

describe('`XmlElement`', () => {
  let options;
  let xml;

  beforeEach(() => {
    options = {};
    xml = `<root></root>`;
  });

  it('is emitted', () => {
    let { root } = parseXml(xml);
    assert(root instanceof XmlElement);
  });

  it('can have emoji names and content', () => {
    let { root } = parseXml('<👨‍👨‍👧‍👦>👧👦</👨‍👨‍👧‍👦>');
    assert.strictEqual(root.name, '👨‍👨‍👧‍👦');
    assert.strictEqual(root.text, '👧👦');
  });

  it('has an `attributes` object with a `null` prototype', () => {
    let { root } = parseXml(xml);
    assert.strictEqual(Object.getPrototypeOf(root.attributes), null);
  });

  describe('with attributes', () => {
    beforeEach(() => {
      xml = `<root b="  a &gt; b  &lt; c " a="'foo'" c = '"foo"' 🤔="😼"/>`;
    });

    it('has an `attributes` object with a `null` prototype', () => {
      let { root } = parseXml(xml);
      assert.strictEqual(Object.getPrototypeOf(root.attributes), null);
    });

    it('has a normalized `attributes` object with unsorted attributes', () => {
      let { root } = parseXml(xml);

      assert.deepEqual(root.attributes, {
        b: '  a > b  < c ',
        a: "'foo'",
        c: '"foo"',
        '🤔': '😼'
      });

      assert.deepEqual(Object.keys(root.attributes), [ 'b', 'a', 'c', '🤔' ]);
    });

    describe('when `options.sortAttributes` is `true`', () => {
      beforeEach(() => {
        options.sortAttributes = true;
      });

      it('has sorted attributes', () => {
        let { root } = parseXml(xml, options);
        assert.deepEqual(Object.keys(root.attributes), [ 'a', 'b', 'c', '🤔' ]);
      });
    });
  });

  describe('with children', () => {
    beforeEach(() => {
      xml = `<root>foo<a>bar</a><b><c>baz</c></b></root>`;
    });

    it('has an array of children', () => {
      let { root } = parseXml(xml);
      let [ textNode, aNode, bNode ] = root.children;

      assert(textNode instanceof XmlText);
      assert.strictEqual(textNode.text, 'foo');
      assert.strictEqual(textNode.parent, root);

      assert(aNode instanceof XmlElement);
      assert.strictEqual(aNode.name, 'a');
      assert.strictEqual(aNode.text, 'bar');
      assert.strictEqual(aNode.parent, root);

      assert(bNode instanceof XmlElement);
      assert.strictEqual(bNode.name, 'b');
      assert.strictEqual(bNode.text, 'baz');
      assert.strictEqual(bNode.parent, root);
    });
  });

  describe('with an `xml:space` attribute', () => {
    describe('when `xml:space` is set to "default"', () => {
      beforeEach(() => {
        xml = `<root xml:space="default"></root>`;
      });

      it("`preserveWhitespace` is `false`", () => {
        assert.strictEqual(parseXml(xml).preserveWhitespace, false);
      });
    });

    describe('when `xml:space` of the nearest ancestor is set to "default"', () => {
      beforeEach(() => {
        xml = `<root xml:space="preserve"><a xml:space="default"><b><c /></b></a></root>`;
      });

      it('`preserveWhitespace` is `false`', () => {
        let [ c ] = parseXml(xml).root.children[0].children[0].children;
        assert.strictEqual(c.preserveWhitespace, false);
      });
    });

    describe('when `xml:space` is set to "preserve"', () => {
      beforeEach(() => {
        xml = `<root xml:space="preserve"></root>`;
      });

      it('`preserveWhitespace` is `true`', () => {
        assert.strictEqual(parseXml(xml).root.preserveWhitespace, true);
      });
    });

    describe('when `xml:space` of the nearest ancestor is set to "preserve"', () => {
      beforeEach(() => {
        xml = `<root xml:space="preserve"><a><b><c /></b></a></root>`;
      });

      it('`preserveWhitespace` is `true`', () => {
        let [ c ] = parseXml(xml).root.children[0].children[0].children;
        assert.strictEqual(c.preserveWhitespace, true);
      });
    });
  });
});
