/* eslint-env mocha */
import assert from 'node:assert';

import { parseXml, XmlDocument, XmlElement, XmlError, XmlNode } from '@rgrove/parse-xml';

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

    it('the end offset of a node at the end of a document with multibyte characters is the byte length of the document', () => {
      let offsetOptions = { includeOffsets: true, preserveComments: true };

      let { root } = parseXml('<root>😀</root>', offsetOptions);
      assert.strictEqual(root.end, 15);

      let doc = parseXml('<root>😀</root><!-- 🐈 -->', offsetOptions);
      assert.strictEqual(doc.children[1].end, 26);

      doc = parseXml('<root/><?pi 🐕?>', offsetOptions);
      assert.strictEqual(doc.children[1].end, 16);
    });
  });

  describe('when `options.rejectAttributeListDeclarations` is `true`', () => {
    beforeEach(() => {
      options.rejectAttributeListDeclarations = true;
    });

    it('rejects an attribute-list declaration in the internal subset', () => {
      assert.throws(() => {
        parseXml('<!DOCTYPE a [<!ELEMENT a EMPTY> <!ATTLIST a b CDATA "x">]><a/>', options);
      }, {
        message: /^Attribute-list declarations aren't allowed when `rejectAttributeListDeclarations` is enabled \(line 1, column 33\)/,
        pos: 32,
      });
    });

    it('rejects a parameter entity reference in the internal subset', () => {
      assert.throws(() => {
        parseXml(`<!DOCTYPE a [<!ENTITY % p "&#60;!ATTLIST a b CDATA 'x'>"> %p;]><a/>`, options);
      }, {
        message: /^Parameter entity references aren't allowed when `rejectAttributeListDeclarations` is enabled \(line 1, column 59\)/,
        pos: 58,
      });
    });

    it('allows other markup declarations, comments, and processing instructions in the internal subset', () => {
      let doc = parseXml(`<!DOCTYPE a [
        <!ELEMENT a ANY>
        <!ENTITY % p "<!ATTLIST a b CDATA 'x'>">
        <!ENTITY e "<!ATTLIST a b CDATA 'x'>">
        <!NOTATION n SYSTEM "<!ATTLIST">
        <!-- <!ATTLIST a b CDATA 'x'> %p; -->
        <?pi <!ATTLIST a b CDATA 'x'> %p; ?>
      ]><a/>`, options);

      assert.strictEqual(doc.root.name, 'a');
    });

    it('allows documents without an internal subset', () => {
      let doc = parseXml('<!DOCTYPE a SYSTEM "a.dtd"><a/>', options);
      assert.strictEqual(doc.root.name, 'a');
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
          parseXml('<?xml?>');
        }, {
          column: 6,
          excerpt: '<?xml?>',
          line: 1,
          message: 'Invalid XML declaration (line 1, column 6)\n' +
            '  <?xml?>\n' +
            '       ^\n',
          pos: 5,
        });
      });
    });

    describe('XML declaration without whitespace before `standalone`', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<?xml version="1.0" encoding="A"standalone="no"?>');
        }, {
          column: 33,
          excerpt: '<?xml version="1.0" encoding="A"standalone="no"?>',
          line: 1,
          message: 'Invalid or unclosed XML declaration (line 1, column 33)\n' +
            '  <?xml version="1.0" encoding="A"standalone="no"?>\n' +
            '                                  ^\n',
          pos: 32,
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

    describe('doctype declaration without whitespace before system identifier', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<!DOCTYPE html PUBLIC "foo""bar">');
        }, {
          column: 28,
          excerpt: '<!DOCTYPE html PUBLIC "foo""bar">',
          line: 1,
          message: 'Expected a system identifier (line 1, column 28)\n' +
            '  <!DOCTYPE html PUBLIC "foo""bar">\n' +
            '                             ^\n',
          pos: 27,
        });
      });
    });

    describe('doctype declaration with unclosed internal subset', () => {
      it('throws an error', () => {
        assert.throws(() => {
          parseXml('<!DOCTYPE html [ >');
        }, {
          column: 18,
          excerpt: '<!DOCTYPE html [ >',
          line: 1,
          message: 'Unclosed internal subset (line 1, column 18)\n' +
            '  <!DOCTYPE html [ >\n' +
            '                   ^\n',
          pos: 17,
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

    // https://www.w3.org/TR/2008/REC-xml-20081126/#sec-line-ends
    it('normalizes line breaks in text, CDATA sections, comments, and processing instructions', () => {
      let input = 'a\r\nb\rc\nd\r\r\ne\n\rf\r';
      let expected = 'a\nb\nc\nd\n\ne\n\nf\n';
      let doc = parseXml(`<a>${input}<![CDATA[${input}]]><!--${input}--><?pi ${input}?></a>`, {
        preserveCdata: true,
        preserveComments: true,
      });

      let [ text, cdata, comment, pi ] = doc.root.children;

      assert.strictEqual(text.text, expected);
      assert.strictEqual(cdata.text, expected);
      assert.strictEqual(comment.content, expected);
      assert.strictEqual(pi.content, expected);
    });

    it('normalizes many carriage returns in linear time', () => {
      let { root } = parseXml(`<a>${'\r'.repeat(1000000)}</a>`);
      assert.strictEqual(root.text, '\n'.repeat(1000000));
    });

    // https://github.com/rgrove/parse-xml/issues/6
    // https://www.w3.org/TR/2008/REC-xml-20081126/#AVNormalize
    it("doesn't normalize a character reference for a whitespace character other than space (\\x20)", () => {
      let { root } = parseXml('<a b=" &#xD; &#xA; &#x9; " c=" a&#x20;&#x20;&#x20;z " d=" a   z " e=" \r \n \t " />');
      assert.strictEqual(root.attributes.b, " \r \n \t ");
      assert.strictEqual(root.attributes.c, " a   z ");
      assert.strictEqual(root.attributes.d, " a   z ");
    });

    // A character reference for a carriage return (`&#xD;` / `&#13;`) in content
    // must be preserved as a literal `\r`. Line break normalization only applies
    // to literal line breaks in the input, not to characters that come from a
    // character reference.
    // https://www.w3.org/TR/2008/REC-xml-20081126/#sec-line-ends
    // https://www.w3.org/TR/2008/REC-xml-20081126/#entproc
    it("doesn't normalize a character reference for a carriage return in content", () => {
      assert.strictEqual(parseXml('<a>&#xD;</a>').root.children[0].text, '\r');
      assert.strictEqual(parseXml('<a>&#13;</a>').root.children[0].text, '\r');

      // A literal `\r` is normalized to `\n`, but a `&#xD;` reference following
      // it must remain a `\r`.
      assert.strictEqual(parseXml('<a>x\r&#xD;y</a>').root.children[0].text, 'x\n\ry');

      // `&#xD;&#xA;` must remain `\r\n` rather than collapsing to `\n` or `\n\n`.
      assert.strictEqual(parseXml('<a>&#xD;&#xA;</a>').root.children[0].text, '\r\n');
    });

    // A numeric character reference must consist solely of digits, so a
    // reference like `&#65a;` or `&#x41g;` is malformed and must be rejected
    // rather than silently truncated to the leading numeric portion.
    // https://www.w3.org/TR/2008/REC-xml-20081126/#NT-CharRef
    it('rejects a numeric character reference with trailing non-digit characters', () => {
      assert.throws(() => parseXml('<a>&#65a;</a>'), /Invalid character reference/);
      assert.throws(() => parseXml('<a>&#48f;</a>'), /Invalid character reference/);
      assert.throws(() => parseXml('<a>&#x41g;</a>'), /Invalid character reference/);
      assert.throws(() => parseXml('<a b="&#65z;" />'), /Invalid character reference/);
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

    // The internal subset ends at the first `]` that isn't inside a comment,
    // processing instruction, or quoted literal, all of which may contain `]>`.
    // https://www.w3.org/TR/2008/REC-xml-20081126/#NT-doctypedecl
    it("doesn't end a DTD internal subset at `]>` inside a literal, comment, or processing instruction", () => {
      let payload = ']><a><b>wrong</b></a><?x ';

      let subsets = [
        `<!ENTITY e "${payload}">`,
        `<!ENTITY e '${payload}'>`,
        `<!ENTITY e SYSTEM "${payload}">`,
        `<!NOTATION n SYSTEM "${payload}">`,
        `<!NOTATION n PUBLIC "x" '${payload}'>`,
        `<!-- ${payload} -->`,
        `<?pi ${payload}?>`,
      ];

      for (let subset of subsets) {
        let doc = parseXml(`<!DOCTYPE a [${subset}]><a><b>right</b></a><?x ?>`, {
          preserveComments: true,
          preserveDocumentType: true,
        });

        assert.deepStrictEqual(doc.children.map(node => node.type), [
          XmlNode.TYPE_DOCUMENT_TYPE,
          XmlNode.TYPE_ELEMENT,
          XmlNode.TYPE_PROCESSING_INSTRUCTION,
        ], subset);

        assert.strictEqual(doc.children[0].internalSubset, subset);
        assert.strictEqual(doc.root.text, 'right', subset);
      }

      // An attribute value can't contain `<`, but it can contain `]>`.
      let doc = parseXml(`<!DOCTYPE a [<!ATTLIST a b CDATA "]>">]><a>right</a>`);
      assert.strictEqual(doc.root.text, 'right');
    });

    it('preserves a DTD internal subset containing multibyte characters', () => {
      let subset = '<!ENTITY e "😀]>😀"><!-- 😀 -->';
      let xml = `<!DOCTYPE a [${subset}]><a>😀</a>`;
      let doc = parseXml(xml, { includeOffsets: true, preserveDocumentType: true });
      let [ doctype, root ] = doc.children;

      assert.strictEqual(doctype.internalSubset, subset);
      assert.strictEqual(doctype.start, 0);
      assert.strictEqual(doctype.end, xml.indexOf('<a>'));
      assert.strictEqual(root.start, xml.indexOf('<a>'));
      assert.strictEqual(root.text, '😀');
    });

    it('reports the correct position of an invalid character following multibyte characters', () => {
      assert.throws(() => parseXml('<a>😀\uD800</a>'), { column: 5, pos: 4 });
      assert.throws(() => parseXml('<a>😀😀\u0001x</a>'), { column: 6, pos: 5 });
      assert.throws(() => parseXml('<!DOCTYPE a [<!ENTITY 😀 "\u0001">]><a/>'), { column: 26, pos: 25 });
    });

    it('reports an unclosed markup declaration at the end of the input', () => {
      assert.throws(() => parseXml('<!DOCTYPE a [<!ENTITY 😀😀 x'), {
        column: 27,
        message: /^Unclosed markup declaration/,
        pos: 26,
      });

      assert.throws(() => parseXml('<!DOCTYPE a [<!ENTITY e x\u0001'), /Invalid character/);
    });

    it('allows parameter entity references between declarations in a DTD internal subset', () => {
      let doc = parseXml('<!DOCTYPE a [<!ENTITY % e "<!ELEMENT a ANY>"> %e; ]><a/>');
      assert.strictEqual(doc.root.name, 'a');
    });

    it('rejects a malformed DTD internal subset instead of guessing where it ends', () => {
      assert.throws(() => parseXml('<!DOCTYPE a [<!ELEMENT a ANY]><a/>'), /Unclosed markup declaration/);
      assert.throws(() => parseXml('<!DOCTYPE a [<!ENTITY e "]><a/>'), /Missing end quote/);
      assert.throws(() => parseXml('<!DOCTYPE a [<!-- ]><a/>'), /Unclosed comment/);
      assert.throws(() => parseXml('<!DOCTYPE a [<?pi ]><a/>'), /Unterminated processing instruction/);
      assert.throws(() => parseXml('<!DOCTYPE a [%e ]><a/>'), /Invalid parameter entity reference/);
      assert.throws(() => parseXml('<!DOCTYPE a [<![IGNORE[ ]]> ]><a/>'), /Unclosed internal subset/);
      assert.throws(() => parseXml('<!DOCTYPE a [ <a/> ]><a/>'), /Unclosed internal subset/);
    });

    // Like `EncodingDecl`, `SDDecl` begins with mandatory whitespace.
    // https://www.w3.org/TR/2008/REC-xml-20081126/#NT-SDDecl
    it('requires whitespace before `standalone` in an XML declaration', () => {
      assert.throws(() => parseXml('<?xml version="1.0"standalone="yes"?><a/>'), {
        message: /^Invalid or unclosed XML declaration/,
        pos: 19,
      });

      assert.throws(() => parseXml('<?xml version="1.0" encoding="UTF-8"standalone="yes"?><a/>'), {
        message: /^Invalid or unclosed XML declaration/,
        pos: 36,
      });

      assert.throws(() => parseXml("<?xml version='1.0' encoding='UTF-8'standalone='no'?><a/>"), {
        message: /^Invalid or unclosed XML declaration/,
        pos: 36,
      });

      // An empty encoding name must not bypass the whitespace requirement.
      assert.throws(() => parseXml('<?xml version="1.0" encoding=""standalone="yes"?><a/>'), {
        message: /^Invalid character in encoding name/,
        pos: 31,
      });
    });

    it('allows any whitespace before `standalone` and around `=` in an XML declaration', () => {
      let xmls = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a/>',
        '<?xml version="1.0" encoding="UTF-8"\tstandalone="yes"?><a/>',
        '<?xml version="1.0" encoding="UTF-8"\r\nstandalone="yes"?><a/>',
        "<?xml version='1.0'\nencoding = 'UTF-8'\n standalone = 'yes' ?><a/>",
      ];

      for (let xml of xmls) {
        let [ node ] = parseXml(xml, { preserveXmlDeclaration: true }).children;
        assert.strictEqual(node.encoding, 'UTF-8', xml);
        assert.strictEqual(node.standalone, 'yes', xml);
      }
    });

    // https://www.w3.org/TR/2008/REC-xml-20081126/#NT-EncodingDecl
    it('rejects an XML declaration with an empty or incomplete encoding declaration', () => {
      assert.throws(() => parseXml('<?xml version="1.0" encoding=""?><a/>'), {
        message: /^Invalid character in encoding name/,
        pos: 31,
      });

      assert.throws(() => parseXml('<?xml version="1.0" encoding?><a/>'), {
        message: /^Invalid or unclosed XML declaration/,
        pos: 28,
      });

      assert.throws(() => parseXml('<?xml version="1.0" encoding=?><a/>'), {
        message: /^Invalid or unclosed XML declaration/,
        pos: 29,
      });

      assert.throws(() => parseXml('<?xml version="1.0" encoding standalone="yes"?><a/>'), {
        message: /^Invalid or unclosed XML declaration/,
        pos: 29,
      });

      assert.throws(() => parseXml('<?xml version="1.0" encoding= standalone="yes"?><a/>'), {
        message: /^Invalid or unclosed XML declaration/,
        pos: 30,
      });
    });

    // https://www.w3.org/TR/2008/REC-xml-20081126/#NT-SDDecl
    it('rejects an XML declaration with an empty or incomplete standalone declaration', () => {
      assert.throws(() => parseXml('<?xml version="1.0" standalone=""?><a/>'), {
        message: /^Only "yes" and "no" are permitted as values of `standalone`/,
        pos: 33,
      });

      assert.throws(() => parseXml('<?xml version="1.0" standalone?><a/>'), {
        message: /^Invalid or unclosed XML declaration/,
        pos: 30,
      });

      assert.throws(() => parseXml('<?xml version="1.0" standalone=?><a/>'), {
        message: /^Invalid or unclosed XML declaration/,
        pos: 31,
      });

      assert.throws(() => parseXml('<?xml version="1.0" encoding="UTF-8" standalone=""?><a/>'), {
        message: /^Only "yes" and "no" are permitted as values of `standalone`/,
        pos: 50,
      });

      assert.throws(() => parseXml('<?xml version="1.0" encoding="UTF-8" standalone?><a/>'), {
        message: /^Invalid or unclosed XML declaration/,
        pos: 47,
      });
    });

    // These are the XML declarations from the IBM not-wf conformance tests for
    // productions [23]-[26], [32], [80], and [81]. The conformance suite skips
    // the IBM not-wf tests because many of their other fixtures are broken.
    it('rejects malformed XML declarations from the IBM not-wf conformance tests', () => {
      let decls = [
        `<?xml encoding="ASCII" ?>`, // ibm23n01
        `<?xml encoding='ASCII' version='1.0'?>`, // ibm23n02
        `<?xml encoding='ASCII' standalone='yes' version='1.0'?>`, // ibm23n03
        `<?XML version='1.0'?>`, // ibm23n04
        `<?xml version='1.0' encoding='ASCII' standalone='yes' >`, // ibm23n05
        `<!xml version='1.0' encoding='ASCII' standalone='yes' ?>`, // ibm23n06
        `<?xml version= ?>`, // ibm24n01
        `<?xmlversion='1.0' ?>`, // ibm24n02
        `<?xml version'1.0' ?>`, // ibm24n03
        `<?xml '1.0'=version ?>`, // ibm24n04
        `<?xml version'1.0'= ?>`, // ibm24n05
        `<?xml Version='1.0' ?>`, // ibm24n06
        `<?xml versioN='1.0' ?>`, // ibm24n07
        `<?xml version='1.0" ?>`, // ibm24n08
        `<?xml version='1.0 ?>`, // ibm24n09
        `<?xml version=='1.0' ?>`, // ibm25n01
        `<?xml version eq '1.0' ?>`, // ibm25n02
        `<?xml version='_#1.0' ?>`, // ibm26n01
        `<?xml version="1.0"standalone="yes" ?>`, // ibm32n01
        `<?xml version="1.0" standalone"yes" ?>`, // ibm32n02
        `<?xml version="1.0" Standalone="yes" ?>`, // ibm32n03
        `<?xml version="1.0" standalone="Yes" ?>`, // ibm32n04
        `<?xml version="1.0" standalone="YES" ?>`, // ibm32n05
        `<?xml version="1.0" standalone="No" ?>`, // ibm32n06
        `<?xml version="1.0" standalone="NO" ?>`, // ibm32n07
        `<?xml version="1.0" standalone"Yes"= ?>`, // ibm32n08
        `<?xml version="1.0"encoding="UTF-8"?>`, // ibm80n01
        `<?xml version="1.0" encoding "UTF-8"?>`, // ibm80n02
        `<?xml version="1.0" encoding= ?>`, // ibm80n03
        `<?xml version="1.0" "UTF-8"encoding=?>`, // ibm80n04
        `<?xml version="1.0" "UTF-8"=encoding?>`, // ibm80n05
        `<?xml version="1.0" Encoding="UTF-8"?>`, // ibm80n06
        `<?xml version="1.0" encoding="_UTF-8"?>`, // ibm81n01
        `<?xml version="1.0" encoding="-UTF-8"?>`, // ibm81n02
        `<?xml version="1.0" encoding=".UTF-8"?>`, // ibm81n03
        `<?xml version="1.0" encoding="8-UTF"?>`, // ibm81n04
        `<?xml version="1.0" encoding="UTF~8"?>`, // ibm81n05
        `<?xml version="1.0" encoding="UTF#8"?>`, // ibm81n06
        `<?xml version="1.0" encoding="UTF:8"?>`, // ibm81n07
        `<?xml version="1.0" encoding="UTF/8"?>`, // ibm81n08
        `<?xml version="1.0" encoding="UTF;8"?>`, // ibm81n09
      ];

      for (let decl of decls) {
        assert.throws(() => parseXml(`${decl}<a/>`), XmlError, decl);
      }
    });

    // `ExternalID` requires whitespace between the `SYSTEM` or `PUBLIC` keyword
    // and each literal that follows it.
    // https://www.w3.org/TR/2008/REC-xml-20081126/#NT-ExternalID
    it('requires whitespace before the system identifier in a doctype declaration', () => {
      assert.throws(() => parseXml('<!DOCTYPE a SYSTEM"y"><a/>'), {
        message: /^Expected a system identifier/,
        pos: 18,
      });

      assert.throws(() => parseXml("<!DOCTYPE a SYSTEM'y'><a/>"), {
        message: /^Expected a system identifier/,
        pos: 18,
      });

      assert.throws(() => parseXml('<!DOCTYPE a PUBLIC "x""y"><a/>'), {
        message: /^Expected a system identifier/,
        pos: 22,
      });

      assert.throws(() => parseXml("<!DOCTYPE a PUBLIC 'x''y' []><a/>"), {
        message: /^Expected a system identifier/,
        pos: 22,
      });
    });

    it('allows any whitespace between the parts of an external ID in a doctype declaration', () => {
      let doc = parseXml('<!DOCTYPE a\tSYSTEM\r\n"y"[]><a/>', { preserveDocumentType: true });
      assert.strictEqual(doc.children[0].systemId, 'y');

      doc = parseXml('<!DOCTYPE a\nPUBLIC\t"x"\r\n"y"\t><a/>', { preserveDocumentType: true });
      assert.strictEqual(doc.children[0].publicId, 'x');
      assert.strictEqual(doc.children[0].systemId, 'y');
    });
  });
});
