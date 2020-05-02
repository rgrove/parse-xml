/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../src');

describe("parseXml()", () => {
  let options;
  let xml;

  it("should parse an XML string and return an object tree", () => {
    let doc = parseXml('<root />');

    assertIsDocument(doc);
    assertChildren(doc.children, [ assertIsElement ]);
  });

  it("should ignore DTDs", () => {
    let doc = parseXml('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><root />');

    assertIsDocument(doc);
    assertChildren(doc.children, [ assertIsElement ]);

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

    assertIsDocument(doc);
    assertChildren(doc.children, [ assertIsElement ]);
  });

  it("should ignore XML declarations", () => {
    let doc = parseXml('<?xml version="1.0" encoding-"UTF-8"?><root />');

    assertIsDocument(doc);
    assertChildren(doc.children, [ assertIsElement ]);
  });

  describe("when `options.ignoreUndefinedEntities` is `true`", () => {
    beforeEach(() => {
      options = { ignoreUndefinedEntities: true };
      xml = '<root foo="bar &bogus; baz">&quux;</root>';
    });

    it("should emit undefined entities as-is", () => {
      let [ root ] = parseXml(xml, options).children;
      let [ text ] = root.children;

      assert.equal(root.attributes.foo, 'bar &bogus; baz');
      assert.equal(text.text, '&quux;');
    });
  });

  describe("when `options.resolveUndefinedEntity` is set", () => {
    beforeEach(() => {
      options = {
        resolveUndefinedEntity(ref) {
          if (ref === '&kittens;') {
            return 'kittens are fuzzy';
          }
        }
      };

      xml = '<root foo="bar &kittens; baz">&kittens;</root>';
    });

    it("should resolve undefined entities", () => {
      let [ root ] = parseXml(xml, options).children;
      let [ text ] = root.children;

      assert.equal(root.attributes.foo, 'bar kittens are fuzzy baz');
      assert.equal(text.text, 'kittens are fuzzy');
    });

    describe("when the resolved value is `null` or `undefined`", () => {
      beforeEach(() => {
        options = {
          ignoreUndefinedEntities: true,

          resolveUndefinedEntity(ref) {
            if (ref === '&null;') {
              return null;
            }
          }
        };

        xml = '<root>&null;&undefined;</root>';
      });

      it("should treat the entity as unresolved", () => {
        let [ root ] = parseXml(xml, options).children;
        let [ text ] = root.children;

        assert.equal(text.text, '&null;&undefined;');
      });
    });
  });

  describe("`cdata` nodes", () => {
    beforeEach(() => {
      xml = `<root><![CDATA[ 1 + 2 < 2 + 2 ]]></root>`;
    });

    it("should not be emitted by default", () => {
      let [ root ] = parseXml(xml).children;
      let [ node ] = root.children;
      assertIsText(node);
    });

    describe("when `options.preserveCdata` is `true`", () => {
      beforeEach(() => {
        options = { preserveCdata: true };
      });

      it("should be emitted", () => {
        let [ root ] = parseXml(xml, options).children;
        let [ node ] = root.children;

        assertIsCdata(node);
        assert.equal(node.text, ' 1 + 2 < 2 + 2 ');
        assert.equal(node.parent, root);
      });

      it("should be serializable", () => {
        let [ root ] = parseXml(xml, options).children;
        let [ node ] = root.children;

        assert(JSON.stringify(node));
      });
    });
  });

  describe("`comment` nodes", () => {
    beforeEach(() => {
      xml = `<root><!-- I'm a comment! --></root>`;
    });

    it("should not be emitted by default", () => {
      let [ root ] = parseXml(xml).children;
      assert.equal(root.children.length, 0);
    });

    describe("when `options.preserveComments` is `true`", () => {
      beforeEach(() => {
        options = { preserveComments: true };
      });

      it("should be emitted", () => {
        let [ root ] = parseXml(xml, options).children;
        let [ node ] = root.children;

        assertIsComment(node);
        assert.equal(node.content, "I'm a comment!");
        assert.equal(node.parent, root);
      });

      it("should be serializable", () => {
        let [ root ] = parseXml(xml, options).children;
        let [ node ] = root.children;

        assert(JSON.stringify(node));
      });
    });
  });

  describe("a `document` node", () => {
    beforeEach(() => {
      xml = `<root></root>`;
    });

    it("should be emitted", () => {
      assertIsDocument(parseXml(xml));
    });

    it("should be serializable", () => {
      assert(JSON.stringify(parseXml(xml)));
    });
  });

  describe("`element` nodes", () => {
    beforeEach(() => {
      xml = `<root></root>`;
    });

    it("should be emitted", () => {
      let [ root ] = parseXml(xml).children;
      assertIsElement(root);
    });

    it("should be serializable", () => {
      let [ root ] = parseXml(xml).children;
      assert(JSON.stringify(root));
    });

    it("should allow emoji names and content", () => {
      let [ root ] = parseXml('<👨‍👨‍👧‍👦>👧👦</👨‍👨‍👧‍👦>').children;

      assertIsElement(root);
      assert.equal(root.name, '👨‍👨‍👧‍👦');
      assert.equal(root.children[0].text, '👧👦');
    });

    describe("with attributes", () => {
      beforeEach(() => {
        xml = `<root b="  a &gt; b  &lt; c " a="'foo'" c = '"foo"' 🤔="😼"/>`;
      });

      it("should emit a normalized `attributes` hash", () => {
        let [ root ] = parseXml(xml).children;

        assertIsElement(root);

        assertAttributes(root.attributes, {
          a: "'foo'",
          b: '  a > b  < c ',
          c: '"foo"',
          '🤔': '😼'
        });
      });
    });

    describe("with children", () => {
      beforeEach(() => {
        xml = `<root>foo<a>bar</a><b><c>baz</c></b></root>`;
      });

      it("should emit an array of children", () => {
        let [ root ] = parseXml(xml).children;

        assertChildren(root.children, [
          assertIsText,
          assertIsElement,
          assertIsElement,
        ]);
      });
    });

    describe("with an `xml:space` attribute", () => {
      describe("when `xml:space` is set to 'default'", () => {
        beforeEach(() => {
          xml = `<root xml:space="default"></root>`;
        });

        it("should not have `preserveWhitespace`", () => {
          let [ root ] = parseXml(xml).children;
          assert.strictEqual(root.preserveWhitespace, void 0);
        });
      });

      describe("when `xml:space` of the nearest ancestor is set to 'default'", () => {
        beforeEach(() => {
          xml = `<root xml:space="preserve"><a xml:space="default"><b><c /></b></a></root>`;
        });

        it("should not have `preserveWhitespace`", () => {
          let [ c ] = parseXml(xml).children[0].children[0].children[0].children;
          assert.strictEqual(c.preserveWhitespace, void 0);
        });
      });

      describe("when `xml:space` is set to 'preserve'", () => {
        beforeEach(() => {
          xml = `<root xml:space="preserve"></root>`;
        });

        it("should have `preserveWhitespace: true`", () => {
          let [ root ] = parseXml(xml).children;
          assert.strictEqual(root.preserveWhitespace, true);
        });
      });

      describe("when `xml:space` of the nearest ancestor is set to 'preserve'", () => {
        beforeEach(() => {
          xml = `<root xml:space="preserve"><a><b><c /></b></a></root>`;
        });

        it("should have `preserveWhitespace: true`", () => {
          let [ c ] = parseXml(xml).children[0].children[0].children[0].children;
          assert.strictEqual(c.preserveWhitespace, true);
        });
      });
    });
  });

  describe("`text` nodes", () => {
    beforeEach(() => {
      xml = `<root> foo &amp;  bar\r\nbaz </root>`;
    });

    it("should be emitted", () => {
      let [ root ] = parseXml(xml).children;
      let [ text ] = root.children;

      assertIsText(text);
      assert.equal(text.text, ' foo &  bar\nbaz ');
    });

    it("should be serializable", () => {
      let [ root ] = parseXml(xml).children;
      assert(JSON.stringify(root));
    });
  });

  describe("bugs", () => {
    it("should not truncate attribute values at `=` characters", () => {
      let [ root ] = parseXml(`<a b="foo=bar=baz" c =  'quux=moo' />`).children;
      assert.equal(root.attributes.b, 'foo=bar=baz');
      assert.equal(root.attributes.c, 'quux=moo');
    });

    // https://www.w3.org/TR/2008/REC-xml-20081126/#sec-line-ends
    it("should normalize `\\r` not followed by `\\n` to `\\n`", () => {
      let [ root ] = parseXml('<a\r>baz\rquux\r\rmoo</a>').children;
      assert.equal(root.children[0].text, 'baz\nquux\n\nmoo');
    });

    // https://github.com/rgrove/parse-xml/issues/6
    // https://www.w3.org/TR/2008/REC-xml-20081126/#AVNormalize
    it("should not normalize a character reference for a whitespace character other than space (\\x20)", () => {
      let [ root ] = parseXml('<a b=" &#xD; &#xA; &#x9; " c=" a&#x20;&#x20;&#x20;z " d=" a   z " e=" \r \n \t " />').children;
      assert.equal(root.attributes.b, " \r \n \t ");
      assert.equal(root.attributes.c, " a   z ");
      assert.equal(root.attributes.d, " a   z ");
    });

    it("should handle many character references in a single attribute", () => {
      {
        let [ root ] = parseXml('<a b="&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;"/>').children;
        assert.equal(root.attributes.b, "<".repeat(35));
      }
      {
        let [ root ] = parseXml('<a b="&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;"></a>').children;
        assert.equal(root.attributes.b, "<".repeat(35));
      }
    });

    it('should parse an extremely long attribute value', () => {
      let value = 'c'.repeat(9000000);
      let [ root ] = parseXml(`<a b="${value}"/>`).children;
      assert.equal(root.attributes.b, value);
    });
  });
});

// -- Helpers ------------------------------------------------------------------
const nodeKeys = [ 'parent', 'toJSON', 'type' ];

function assertAttributes(actual, expected) {
  assert.equal(typeof actual, 'object', '`attributes` must be an object');
  assert.strictEqual(Object.getPrototypeOf(actual), null, 'Prototype of the `attributes` property must be `null`');
  assert.deepEqual(Object.keys(actual), Object.keys(actual).sort(), 'Attribute keys must be in alphabetical order');
  assert.deepEqual(actual, expected);
}

function assertChildren(actual, expectedNodeAssertions) {
  assert(Array.isArray(actual), '`children` must be an array');
  assert.equal(actual.length, expectedNodeAssertions.length, "Node doesn't have the expected number of children");
  actual.forEach((actualChild, index) => expectedNodeAssertions[index](actualChild));
}

function assertIsCdata(actual) {
  assertIsNode(actual);
  assert.equal(actual.type, 'cdata', '`type` must be "cdata"');

  assert.deepEqual(
    Object.keys(actual).sort(),

    [
      ...nodeKeys,
      'text',
    ].sort(),

    "Node shouldn't have extra or missing properties"
  );
}

function assertIsComment(actual) {
  assertIsNode(actual);
  assert.equal(actual.type, 'comment', '`type` must be "comment"');

  assert.deepEqual(
    Object.keys(actual).sort(),

    [
      ...nodeKeys,
      'content',
    ].sort(),

    "Node shouldn't have extra or missing properties"
  );
}

function assertIsDocument(actual) {
  assertIsNode(actual);
  assert.equal(actual.type, 'document', '`type` must be "document"');

  assert.deepEqual(
    Object.keys(actual).sort(),

    [
      ...nodeKeys,
      'children',
    ].sort(),

    "Node shouldn't have extra or missing properties"
  );
}

function assertIsElement(actual) {
  assertIsNode(actual);
  assert.equal(actual.type, 'element', '`type` must be "element"');

  assert.deepEqual(
    Object.keys(actual)
      .filter(key => key !== 'preserveWhitespace')
      .sort(),

    [
      ...nodeKeys,
      'attributes',
      'children',
      'name'
    ].sort(),

    "Node shouldn't have extra or missing properties"
  );

  assert.strictEqual(Object.getPrototypeOf(actual.attributes), null, 'Prototype of the `attributes` property must be `null`');

  if ('preserveWhitespace' in actual) {
    assert.strictEqual(actual.preserveWhitespace, true, 'If defined, `preserveWhitespace` must be `true`');
  }
}

function assertIsNode(actual) {
  assert.equal(typeof actual, 'object', 'Nodes must be objects');
  assert.equal(typeof actual.parent, 'object', '`parent` property must be an Object or `null`');
  assert.equal(typeof actual.type, 'string', '`type` property must be a String');
}

function assertIsText(actual) {
  assertIsNode(actual);
  assert.equal(actual.type, 'text', '`type` must be "text"');

  assert.deepEqual(
    Object.keys(actual).sort(),

    [
      ...nodeKeys,
      'text',
    ].sort(),

    "Node shouldn't have extra or missing properties"
  );
}
