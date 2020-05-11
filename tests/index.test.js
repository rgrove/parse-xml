/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../src');

const {
  XmlCdata,
  XmlComment,
  XmlDocument,
  XmlElement,
  XmlNode,
  XmlProcessingInstruction,
  XmlText
} = parseXml;

describe("parseXml()", () => {
  let options;
  let xml;

  beforeEach(() => {
    options = {};
  });

  it("parses an XML string and returns an `XmlDocument`", () => {
    let doc = parseXml('<root />');

    assert(doc instanceof XmlDocument);
    assert.strictEqual(doc.children.length, 1);
    assert(doc.root instanceof XmlElement);
    assert.equal(doc.root.name, 'root');
  });

  it("ignores DTDs", () => {
    let doc = parseXml('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><root />');

    assert(doc instanceof XmlDocument);
    assert.strictEqual(doc.children.length, 1);
    assert(doc.root instanceof XmlElement);
    assert.equal(doc.root.name, 'root');

    doc = parseXml(`
      <!DOCTYPE sgml [
        <!ELEMENT sgml (img)*>

        <!ELEMENT img EMPTY>
        <!ATTLIST img
          data ENTITY #IMPLIED>

        <!ENTITY   example1SVG     SYSTEM "example1.svg" NDATA example1SVG-rdf>
        <!NOTATION example1SVG-rdf SYSTEM "example1.svg.rdf">
      ]>
      <root />
    `);

    assert(doc instanceof XmlDocument);
    assert.strictEqual(doc.children.length, 1);
    assert(doc.root instanceof XmlElement);
    assert.equal(doc.root.name, 'root');
  });

  describe("when `options.ignoreUndefinedEntities` is `true`", () => {
    beforeEach(() => {
      options.ignoreUndefinedEntities = true;
      xml = '<root foo="bar &bogus; baz">&quux;</root>';
    });

    it("emits undefined entities as is", () => {
      let { root } = parseXml(xml, options);
      assert.equal(root.attributes.foo, 'bar &bogus; baz');
      assert.equal(root.text, '&quux;');
    });
  });

  describe("when `options.resolveUndefinedEntity` is set", () => {
    beforeEach(() => {
      options.resolveUndefinedEntity = (ref) => {
        if (ref === '&kittens;') {
          return 'kittens are fuzzy';
        }
      };

      xml = '<root foo="bar &kittens; baz">&kittens;</root>';
    });

    it("resolves undefined entities", () => {
      let { root } = parseXml(xml, options);
      assert.equal(root.attributes.foo, 'bar kittens are fuzzy baz');
      assert.equal(root.text, 'kittens are fuzzy');
    });

    describe("when the resolved value is `null` or `undefined`", () => {
      beforeEach(() => {
        options.ignoreUndefinedEntities = true;

        options.resolveUndefinedEntity = (ref) => {
          if (ref === '&null;') {
            return null;
          }
        };

        xml = '<root>&null;&undefined;</root>';
      });

      it("treats the entity as unresolved", () => {
        let { root } = parseXml(xml, options);
        assert.equal(root.text, '&null;&undefined;');
      });
    });
  });

  describe("`XmlCdata`", () => {
    beforeEach(() => {
      xml = `<root><![CDATA[ 1 + 2 < 2 + 2 ]]></root>`;
    });

    it("isn't emitted by default", () => {
      let [ node ] = parseXml(xml).root.children;
      assert.equal(node.type, XmlNode.TYPE_TEXT);
    });

    describe("when `options.preserveCdata` is `true`", () => {
      beforeEach(() => {
        options.preserveCdata = true;
      });

      it("is emitted", () => {
        let { root } = parseXml(xml, options);
        let [ node ] = root.children;

        assert(node instanceof XmlCdata);
        assert.equal(node.text, ' 1 + 2 < 2 + 2 ');
        assert.equal(node.parent, root);
      });
    });
  });

  describe("`XmlComment`", () => {
    beforeEach(() => {
      xml = `<root><!-- I'm a comment! --></root>`;
    });

    it("isn't emitted by default", () => {
      let { root } = parseXml(xml);
      assert.equal(root.children.length, 0);
    });

    describe("when `options.preserveComments` is `true`", () => {
      beforeEach(() => {
        options = { preserveComments: true };
      });

      it("is emitted", () => {
        let { root } = parseXml(xml, options);
        let [ node ] = root.children;

        assert(node instanceof XmlComment);
        assert.equal(node.content, "I'm a comment!");
        assert.equal(node.parent, root);
      });
    });
  });

  describe("`XmlElement`", () => {
    beforeEach(() => {
      xml = `<root></root>`;
    });

    it("is emitted", () => {
      let { root } = parseXml(xml);
      assert(root instanceof XmlElement);
    });

    it("can have emoji names and content", () => {
      let { root } = parseXml('<👨‍👨‍👧‍👦>👧👦</👨‍👨‍👧‍👦>');
      assert.equal(root.name, '👨‍👨‍👧‍👦');
      assert.equal(root.text, '👧👦');
    });

    it('has an `attributes` object with a `null` prototype', () => {
      let { root } = parseXml(xml);
      assert.strictEqual(Object.getPrototypeOf(root.attributes), null);
    });

    describe("with attributes", () => {
      beforeEach(() => {
        xml = `<root b="  a &gt; b  &lt; c " a="'foo'" c = '"foo"' 🤔="😼"/>`;
      });

      it('has an `attributes` object with a `null` prototype', () => {
        let { root } = parseXml(xml);
        assert.strictEqual(Object.getPrototypeOf(root.attributes), null);
      });

      it("has a normalized `attributes` object with unsorted attributes", () => {
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

        it("has sorted attributes", () => {
          let { root } = parseXml(xml, options);
          assert.deepEqual(Object.keys(root.attributes), [ 'a', 'b', 'c', '🤔' ]);
        });
      });
    });

    describe("with children", () => {
      beforeEach(() => {
        xml = `<root>foo<a>bar</a><b><c>baz</c></b></root>`;
      });

      it("has an array of children", () => {
        let { root } = parseXml(xml);
        let [ textNode, aNode, bNode ] = root.children;

        assert(textNode instanceof XmlText);
        assert.equal(textNode.text, 'foo');
        assert.equal(textNode.parent, root);

        assert(aNode instanceof XmlElement);
        assert.equal(aNode.name, 'a');
        assert.equal(aNode.text, 'bar');
        assert.equal(aNode.parent, root);

        assert(bNode instanceof XmlElement);
        assert.equal(bNode.name, 'b');
        assert.equal(bNode.text, 'baz');
        assert.equal(bNode.parent, root);
      });
    });

    describe("with an `xml:space` attribute", () => {
      describe("when `xml:space` is set to 'default'", () => {
        beforeEach(() => {
          xml = `<root xml:space="default"></root>`;
        });

        it("`preserveWhitespace` is `false`", () => {
          assert.strictEqual(parseXml(xml).preserveWhitespace, false);
        });
      });

      describe("when `xml:space` of the nearest ancestor is set to 'default'", () => {
        beforeEach(() => {
          xml = `<root xml:space="preserve"><a xml:space="default"><b><c /></b></a></root>`;
        });

        it("`preserveWhitespace` is `false`", () => {
          let [ c ] = parseXml(xml).root.children[0].children[0].children;
          assert.strictEqual(c.preserveWhitespace, false);
        });
      });

      describe("when `xml:space` is set to 'preserve'", () => {
        beforeEach(() => {
          xml = `<root xml:space="preserve"></root>`;
        });

        it("`preserveWhitespace` is `true`", () => {
          assert.strictEqual(parseXml(xml).root.preserveWhitespace, true);
        });
      });

      describe("when `xml:space` of the nearest ancestor is set to 'preserve'", () => {
        beforeEach(() => {
          xml = `<root xml:space="preserve"><a><b><c /></b></a></root>`;
        });

        it("`preserveWhitespace` is `true`", () => {
          let [ c ] = parseXml(xml).root.children[0].children[0].children;
          assert.strictEqual(c.preserveWhitespace, true);
        });
      });
    });
  });

  describe("`XmlText` node", () => {
    beforeEach(() => {
      xml = `<root> foo &amp;  bar\r\nbaz </root>`;
    });

    it("is emitted", () => {
      let { root } = parseXml(xml);
      let [ textNode ] = root.children;

      assert(textNode instanceof XmlText);
      assert.equal(textNode.text, ' foo &  bar\nbaz ');
    });
  });

  describe("bugs", () => {
    it("doesn't truncate attribute values at `=` characters", () => {
      let { root } = parseXml(`<a b="foo=bar=baz" c =  'quux=moo' />`);
      assert.equal(root.attributes.b, 'foo=bar=baz');
      assert.equal(root.attributes.c, 'quux=moo');
    });

    // https://www.w3.org/TR/2008/REC-xml-20081126/#sec-line-ends
    it("normalizes `\\r` not followed by `\\n` to `\\n`", () => {
      let { root } = parseXml('<a\r>baz\rquux\r\rmoo</a>');
      assert.equal(root.children[0].text, 'baz\nquux\n\nmoo');
    });

    // https://github.com/rgrove/parse-xml/issues/6
    // https://www.w3.org/TR/2008/REC-xml-20081126/#AVNormalize
    it("doesn't normalize a character reference for a whitespace character other than space (\\x20)", () => {
      let { root } = parseXml('<a b=" &#xD; &#xA; &#x9; " c=" a&#x20;&#x20;&#x20;z " d=" a   z " e=" \r \n \t " />');
      assert.equal(root.attributes.b, " \r \n \t ");
      assert.equal(root.attributes.c, " a   z ");
      assert.equal(root.attributes.d, " a   z ");
    });

    it("handles many character references in a single attribute", () => {
      let { root } = parseXml('<a b="&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;"/>');
      assert.equal(root.attributes.b, "<".repeat(35));

      root = parseXml('<a b="&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;"></a>').root;
      assert.equal(root.attributes.b, "<".repeat(35));
    });

    it('parses an extremely long attribute value', () => {
      let value = 'c'.repeat(9000000);
      let { root } = parseXml(`<a b="${value}"/>`);
      assert.equal(root.attributes.b, value);
    });
  });
});
