/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../src');

const { XmlDocument, XmlElement } = parseXml;

describe('parseXml()', () => {
  let options;
  let xml;

  beforeEach(() => {
    options = {};
  });

  it('parses an XML string and returns an `XmlDocument`', () => {
    let doc = parseXml('<root />');

    assert(doc instanceof XmlDocument);
    assert.strictEqual(doc.children.length, 1);
    assert(doc.root instanceof XmlElement);
    assert.strictEqual(doc.root.name, 'root');
  });

  it('ignores DTDs', () => {
    let doc = parseXml('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><root />');

    assert(doc instanceof XmlDocument);
    assert.strictEqual(doc.children.length, 1);
    assert(doc.root instanceof XmlElement);
    assert.strictEqual(doc.root.name, 'root');

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
    assert.strictEqual(doc.root.name, 'root');
  });

  describe('when `options.ignoreUndefinedEntities` is `true`', () => {
    beforeEach(() => {
      options.ignoreUndefinedEntities = true;
      xml = '<root foo="bar &bogus; baz">&quux;</root>';
    });

    it('emits undefined entities as is', () => {
      let { root } = parseXml(xml, options);
      assert.strictEqual(root.attributes.foo, 'bar &bogus; baz');
      assert.strictEqual(root.text, '&quux;');
    });
  });

  describe('when `options.resolveUndefinedEntity` is set', () => {
    beforeEach(() => {
      options.resolveUndefinedEntity = (ref) => {
        if (ref === '&kittens;') {
          return 'kittens are fuzzy';
        }
      };

      xml = '<root foo="bar &kittens; baz">&kittens;</root>';
    });

    it('resolves undefined entities', () => {
      let { root } = parseXml(xml, options);
      assert.strictEqual(root.attributes.foo, 'bar kittens are fuzzy baz');
      assert.strictEqual(root.text, 'kittens are fuzzy');
    });

    describe('when the resolved value is `null` or `undefined`', () => {
      beforeEach(() => {
        options.ignoreUndefinedEntities = true;

        options.resolveUndefinedEntity = (ref) => {
          if (ref === '&null;') {
            return null;
          }
        };

        xml = '<root>&null;&undefined;</root>';
      });

      it('treats the entity as unresolved', () => {
        let { root } = parseXml(xml, options);
        assert.strictEqual(root.text, '&null;&undefined;');
      });
    });
  });

  describe('bugs', () => {
    it("doesn't truncate attribute values at `=` characters", () => {
      let { root } = parseXml(`<a b="foo=bar=baz" c =  'quux=moo' />`);
      assert.strictEqual(root.attributes.b, 'foo=bar=baz');
      assert.strictEqual(root.attributes.c, 'quux=moo');
    });

    // https://www.w3.org/TR/2008/REC-xml-20081126/#sec-line-ends
    it('normalizes `\\r` not followed by `\\n` to `\\n`', () => {
      let { root } = parseXml('<a\r>baz\rquux\r\rmoo</a>');
      assert.strictEqual(root.children[0].text, 'baz\nquux\n\nmoo');
    });

    // https://github.com/rgrove/parse-xml/issues/6
    // https://www.w3.org/TR/2008/REC-xml-20081126/#AVNormalize
    it("doesn't normalize a character reference for a whitespace character other than space (\\x20)", () => {
      let { root } = parseXml('<a b=" &#xD; &#xA; &#x9; " c=" a&#x20;&#x20;&#x20;z " d=" a   z " e=" \r \n \t " />');
      assert.strictEqual(root.attributes.b, " \r \n \t ");
      assert.strictEqual(root.attributes.c, " a   z ");
      assert.strictEqual(root.attributes.d, " a   z ");
    });

    it('handles many character references in a single attribute', () => {
      let { root } = parseXml('<a b="&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;"/>');
      assert.strictEqual(root.attributes.b, "<".repeat(35));

      root = parseXml('<a b="&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;"></a>').root;
      assert.strictEqual(root.attributes.b, "<".repeat(35));
    });

    it('parses an extremely long attribute value', () => {
      let value = 'c'.repeat(9000000);
      let { root } = parseXml(`<a b="${value}"/>`);
      assert.strictEqual(root.attributes.b, value);
    });
  });
});
