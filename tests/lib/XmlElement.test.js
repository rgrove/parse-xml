/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { parseXml, XmlElement, XmlNode, XmlText } = require('../..');

describe('XmlElement', () => {
  let options;

  beforeEach(() => {
    options = {};
  });

  it('is emitted by the parser', () => {
    let { root } = parseXml('<root />');
    assert(root instanceof XmlElement);
  });

  it('can be serialized to JSON', () => {
    let { root } = parseXml('<a foo="bar" baz="quux"><b xml:space="preserve" /></a>');
    assert.strictEqual(JSON.stringify(root), '{"type":"element","isRootNode":true,"name":"a","attributes":{"foo":"bar","baz":"quux"},"children":[{"type":"element","preserveWhitespace":true,"name":"b","attributes":{"xml:space":"preserve"},"children":[]}]}');
  });

  describe('constructor', () => {
    it('uses default values for `attributes` and `children` if not provided', () => {
      let element = new XmlElement('foo');
      assert.deepStrictEqual(element.attributes, Object.create(null));
      assert.deepStrictEqual(element.children, []);
    });
  });

  describe('attributes', () => {
    it('has a `null` prototype', () => {
      let { root } = parseXml('<root />');
      assert.strictEqual(Object.getPrototypeOf(root.attributes), null);
    });

    it('contains normalized element attributes in definition order', () => {
      let { root } = parseXml(`<root b="  a &gt; b  &lt; c " a="'foo'" c = '"foo"' 🤔="😼"/>`);

      assert.deepEqual(root.attributes, {
        b: '  a > b  < c ',
        a: "'foo'",
        c: '"foo"',
        '🤔': '😼',
      });

      assert.deepEqual(Object.keys(root.attributes), [ 'b', 'a', 'c', '🤔' ]);
    });

    describe('when `options.sortAttributes` is `true`', () => {
      beforeEach(() => {
        options.sortAttributes = true;
      });

      it('sorts attributes in alphabetical order', () => {
        let { root } = parseXml(`<root b="  a &gt; b  &lt; c " a="'foo'" c = '"foo"' 🤔="😼"/>`, options);
        assert.deepEqual(Object.keys(root.attributes), [ 'a', 'b', 'c', '🤔' ]);
      });
    });
  });

  describe('children', () => {
    it('is an array of child nodes', () => {
      let { root } = parseXml('<root>foo<a>bar</a><b><c>baz</c></b></root>');
      assert(Array.isArray(root.children));

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

  describe('document', () => {
    it('is the document', () => {
      let doc = parseXml('<root/>');
      assert.strictEqual(doc.root.document, doc);
    });
  });

  describe('isEmpty', () => {
    it('is `true` when the element is empty', () => {
      let { root } = parseXml('<root />');
      assert.strictEqual(root.isEmpty, true);
    });

    it('is `false` when the element is not empty', () => {
      let { root } = parseXml('<root><child /></root>');
      assert.strictEqual(root.isEmpty, false);
    });
  });

  describe('isRootNode', () => {
    describe('when the element is the root element', () => {
      it('is `true`', () => {
        assert.strictEqual(parseXml('<root/>').root.isRootNode, true);
      });
    });

    describe('when the element is not the root element', () => {
      it('is `false`', () => {
        assert.strictEqual(parseXml('<a><b/></a>').root.children[0].isRootNode, false);
      });
    });
  });

  describe('name', () => {
    it('is the name of the element', () => {
      let { root } = parseXml('<foo />');
      assert.strictEqual(root.name, 'foo');
    });

    it('may contain emoji', () => {
      let { root } = parseXml('<👨‍👨‍👧‍👦></👨‍👨‍👧‍👦>');
      assert.strictEqual(root.name, '👨‍👨‍👧‍👦');
    });
  });

  describe('when `options.includeOffsets` is `false`', () => {
    describe('start', () => {
      it('is `-1`', () => {
        let { root } = parseXml('<root />');
        assert.strictEqual(root.start, -1);
      });
    });

    describe('end', () => {
      it('is `-1`', () => {
        let { root } = parseXml('<root />');
        assert.strictEqual(root.end, -1);
      });
    });
  });

  describe('when `options.includeOffsets` is `true`', () => {
    describe('start', () => {
      it('is the starting byte offset of the element', () => {
        let { root } = parseXml('<a><b><c /></b></a>', { includeOffsets: true });
        assert.strictEqual(root.start, 0);
        assert.strictEqual(root.children[0].start, 3);
        assert.strictEqual(root.children[0].children[0].start, 6);
      });
    });

    describe('end', () => {
      it('is the ending byte offset of the element', () => {
        let { root } = parseXml('<a><b><c /></b></a>', { includeOffsets: true });
        assert.strictEqual(root.end, 19);
        assert.strictEqual(root.children[0].end, 15);
        assert.strictEqual(root.children[0].children[0].end, 11);
      });
    });
  });

  describe('parent', () => {
    describe('when the element is the root element', () => {
      it('is the document', () => {
        let doc = parseXml('<root/>');
        assert.strictEqual(doc.root.parent, doc);
      });
    });

    describe('when the element is not the root element', () => {
      it('is the parent element', () => {
        let doc = parseXml('<a><b/></a>');
        assert.strictEqual(doc.root.children[0].parent, doc.root);
      });
    });
  });

  describe('preserveWhitespace', () => {
    describe('when neither the element nor any ancestor has an `xml:space` attribute', () => {
      it('is `false`', () => {
        let { root } = parseXml('<root />');
        assert.strictEqual(root.preserveWhitespace, false);
      });
    });

    describe('when the value of an element\'s `xml:space` attribute is "default"', () => {
      it('is `false`', () => {
        let { root } = parseXml('<root xml:space="default"/>');
        assert.strictEqual(root.preserveWhitespace, false);
      });
    });

    describe('when the nearest `xml:space` attribute of an ancestor is "default"', () => {
      it('is `false`', () => {
        let c = parseXml('<root xml:space="preserve"><a xml:space="default"><b><c /></b></a></root>')
          .root
          .children[0]
          .children[0]
          .children[0];

        assert.strictEqual(c.preserveWhitespace, false);
      });
    });

    describe('when the value of an element\'s `xml:space` attribute is "preserve"', () => {
      it('is `true`', () => {
        let { root } = parseXml('<root xml:space="preserve"></root>');
        assert.strictEqual(root.preserveWhitespace, true);
      });
    });

    describe('when the nearest `xml:space` attribute of an ancestor is "preserve"', () => {
      it('is `true`', () => {
        let c = parseXml('<root xml:space="preserve"><a><b><c /></b></a></root>')
          .root
          .children[0]
          .children[0]
          .children[0];

        assert.strictEqual(c.preserveWhitespace, true);
      });
    });
  });

  describe('text', () => {
    it('is the text content of the element and its descendants', () => {
      assert.strictEqual(parseXml('<root><a><b>hello</b></a> there!</root>').root.text, 'hello there!');
      assert.strictEqual(parseXml('<root><!-- hi --><a/><!-- hi --></root>', { preserveComments: true }).root.text, '');
    });

    it('may contain emoji', () => {
      let { root } = parseXml('<root>👧👦</root>');
      assert.strictEqual(root.text, '👧👦');
    });
  });

  describe('type', () => {
    it('is `XmlNode.TYPE_ELEMENT`', () => {
      let { root } = parseXml('<root />');
      assert.strictEqual(root.type, XmlNode.TYPE_ELEMENT);
    });
  });
});
