/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { parseXml, XmlDocument, XmlElement } = require('../..');

describe('Parser', () => {
  let options;

  beforeEach(() => {
    options = {};
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
    });

    it('emits undefined entities as is', () => {
      let { root } = parseXml('<root foo="bar &bogus; baz">&quux;</root>', options);
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
    });

    it('resolves undefined entities', () => {
      let { root } = parseXml('<root foo="bar &kittens; baz">&kittens;</root>', options);
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
      });

      it('treats the entity as unresolved', () => {
        let { root } = parseXml('<root>&null;&undefined;</root>', options);
        assert.strictEqual(root.text, '&null;&undefined;');
      });
    });

    describe('when the resolved value is not a string, `null`, or `undefined`', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<root>&foo;</root>', {
            resolveUndefinedEntity: () => 42,
          });
        }, {
          name: 'TypeError',
          message: '`resolveUndefinedEntity()` must return a string, `null`, or `undefined`, but returned a value of type number',
        });
      });
    });
  });

  describe('errors', () => {
    describe('element contains CDATA section close delimiter', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<a>foo]]></a>');
        }, {
          column: 7,
          excerpt: '<a>foo]]></a>',
          line: 1,
          message: 'Element content may not contain the CDATA section close delimiter `]]>` (line 1, column 7)\n' +
            '  <a>foo]]></a>\n' +
            '        ^\n',
          pos: 6,
        });
      });
    });

    describe('extra content at the end of the document', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<a/>\nfoo');
        }, {
          column: 1,
          excerpt: 'foo',
          line: 2,
          message: 'Extra content at the end of the document (line 2, column 1)\n' +
            '  foo\n' +
            '  ^\n',
          pos: 5,
        });
      });
    });

    describe('invalid XML declaration', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<?xmlblah');
        }, {
          column: 6,
          excerpt: '<?xmlblah',
          line: 1,
          message: 'Invalid XML declaration (line 1, column 6)\n' +
            '  <?xmlblah\n' +
            '       ^\n',
          pos: 5,
        });
      });
    });

    describe('root element missing or invalid', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('foo');
        }, {
          column: 1,
          excerpt: 'foo',
          line: 1,
          message: 'Root element is missing or invalid (line 1, column 1)\n' +
            '  foo\n' +
            '  ^\n',
          pos: 0,
        });
      });
    });

    describe('unclosed attribute', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<a unclosed="');
        }, {
          column: 14,
          excerpt: '<a unclosed="',
          line: 1,
          message: 'Unclosed attribute (line 1, column 14)\n' +
            '  <a unclosed="\n' +
            '               ^\n',
          pos: 13,
        });
      });
    });

    describe('unclosed CDATA section', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<a><![CDATA[blah</a>');
        }, {
          column: 13,
          excerpt: '<a><![CDATA[blah</a>',
          line: 1,
          message: 'Unclosed CDATA section (line 1, column 13)\n' +
            '  <a><![CDATA[blah</a>\n' +
            '              ^\n',
          pos: 12,
        });
      });
    });

    describe('unclosed doctype declaration', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<!DOCTYPE foo');
        }, {
          column: 14,
          excerpt: '<!DOCTYPE foo',
          line: 1,
          message: 'Unclosed doctype declaration (line 1, column 14)\n' +
            '  <!DOCTYPE foo\n' +
            '               ^\n',
          pos: 13,
        });
      });
    });

    describe('unescaped `<` in an attribute value', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<a attr="<foo"/>');
        }, {
          column: 10,
          excerpt: '<a attr="<foo"/>',
          line: 1,
          message: 'Unescaped `<` is not allowed in an attribute value (line 1, column 10)\n' +
            '  <a attr="<foo"/>\n' +
            '           ^\n',
          pos: 9,
        });
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
