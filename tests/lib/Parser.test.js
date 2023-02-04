/* eslint-env mocha */
'use strict';

const assert = require('assert');

const { parseXml, XmlDocument, XmlElement, XmlError, XmlNode } = require('../..');

describe('Parser', () => {
  let options;

  beforeEach(() => {
    options = {};
  });

  it('discards DTDs by default', () => {
    let doc = parseXml(`
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html />
    `);

    assert(doc instanceof XmlDocument);
    assert.strictEqual(doc.children.length, 1);
    assert(doc.root instanceof XmlElement);
    assert.strictEqual(doc.root.name, 'html');

    doc = parseXml(`
      <!DOCTYPE sgml [
        <!ELEMENT sgml (img)*>

        <!ELEMENT img EMPTY>
        <!ATTLIST img
          data ENTITY #IMPLIED>

        <!ENTITY   example1SVG     SYSTEM "example1.svg" NDATA example1SVG-rdf>
        <!NOTATION example1SVG-rdf SYSTEM "example1.svg.rdf">
      ]>
      <sgml />
    `);

    assert(doc instanceof XmlDocument);
    assert.strictEqual(doc.children.length, 1);
    assert(doc.root instanceof XmlElement);
    assert.strictEqual(doc.root.name, 'sgml');
  });

  it('normalizes whitespace in attribute values', () => {
    let { root } = parseXml('<root attr=" one two\tthree\nfour\r\nfive\rsix " />');
    assert.strictEqual(root.attributes.attr, ' one two three four five six ');
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

  describe('when `options.includeOffsets` is `true`', () => {
    it('the start offset is a byte offset, not a character offset', () => {
      let { root } = parseXml('<root><cat>🐈</cat><dog>🐕</dog></root>', { includeOffsets: true });
      assert.strictEqual(root.children[1].start, 19);
    });

    it('the end offset is a byte offset, not a character offset', () => {
      let { root } = parseXml('<root><cat>🐈</cat><dog>🐕</dog></root>', { includeOffsets: true });
      assert.strictEqual(root.children[1].end, 32);
    });

    it('a byte order mark character is counted in the offset', () => {
      let { root } = parseXml('\uFEFF<root>foo</root>', { includeOffsets: true });
      assert.strictEqual(root.children[0].start, 7);
    });

    it('a carriage return character is not counted in the offset', () => {
      let { root } = parseXml('<root>\rfoo</root>', { includeOffsets: true });
      assert.strictEqual(root.children[0].start, 6);
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
    it('are thrown as `XmlError` instances', () => {
      let error;

      try {
        parseXml('<a>');
      } catch (err) {
        error = err;
      }

      assert(error instanceof XmlError);
      assert(error instanceof Error);
      assert.strictEqual(error.name, 'XmlError');
    });

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

    describe('doctype declaration without a name', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<!DOCTYPE>');
        }, {
          column: 10,
          excerpt: '<!DOCTYPE>',
          line: 1,
          message: 'Expected a name (line 1, column 10)\n' +
            '  <!DOCTYPE>\n' +
            '           ^\n',
          pos: 9,
        });
      });
    });

    describe('doctype declaration with incomplete public identifier', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<!DOCTYPE html PUBLIC>');
        }, {
          column: 22,
          excerpt: '<!DOCTYPE html PUBLIC>',
          line: 1,
          message: 'Expected a public identifier (line 1, column 22)\n' +
            '  <!DOCTYPE html PUBLIC>\n' +
            '                       ^\n',
          pos: 21,
        });
      });
    });

    describe('doctype declaration with invalid character in public identifier', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<!DOCTYPE html PUBLIC "[foo]" "bar">');
        }, {
          column: 23,
          excerpt: '<!DOCTYPE html PUBLIC "[foo]" "bar">',
          line: 1,
          message: 'Invalid character in public identifier (line 1, column 23)\n' +
            '  <!DOCTYPE html PUBLIC "[foo]" "bar">\n' +
            '                        ^\n',
          pos: 22,
        });
      });
    });

    describe('doctype declaration with public identifier but no system identifier', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<!DOCTYPE html PUBLIC "foo">');
        }, {
          column: 28,
          excerpt: '<!DOCTYPE html PUBLIC "foo">',
          line: 1,
          message: 'Expected a system identifier (line 1, column 28)\n' +
            '  <!DOCTYPE html PUBLIC "foo">\n' +
            '                             ^\n',
          pos: 27,
        });
      });
    });

    describe('doctype declaration with incomplete system identifier', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<!DOCTYPE html SYSTEM>');
        }, {
          column: 22,
          excerpt: '<!DOCTYPE html SYSTEM>',
          line: 1,
          message: 'Expected a system identifier (line 1, column 22)\n' +
            '  <!DOCTYPE html SYSTEM>\n' +
            '                       ^\n',
          pos: 21,
        });
      });
    });

    describe('doctype declaration with unclosed internal subset', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<!DOCTYPE html [ >');
        }, {
          column: 17,
          excerpt: '<!DOCTYPE html [ >',
          line: 1,
          message: 'Unclosed internal subset (line 1, column 17)\n' +
            '  <!DOCTYPE html [ >\n' +
            '                  ^\n',
          pos: 16,
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

    it("doesn't append text to a preceding CDATA node", () => {
      let { root } = parseXml('<a>foo<![CDATA[bar]]>baz</a>', { preserveCdata: true });

      assert.strictEqual(root.children[0].text, 'foo');
      assert.strictEqual(root.children[0].type, XmlNode.TYPE_TEXT);

      assert.strictEqual(root.children[1].text, 'bar');
      assert.strictEqual(root.children[1].type, XmlNode.TYPE_CDATA);

      assert.strictEqual(root.children[2].text, 'baz');
      assert.strictEqual(root.children[2].type, XmlNode.TYPE_TEXT);
    });
  });
});
