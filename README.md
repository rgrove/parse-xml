# parse-xml

A fast, safe, compliant XML parser for Node.js and browsers.

[![npm version](https://badge.fury.io/js/%40rgrove%2Fparse-xml.svg)](https://badge.fury.io/js/%40rgrove%2Fparse-xml)
[![Build Status](https://travis-ci.org/rgrove/parse-xml.svg?branch=master)](https://travis-ci.org/rgrove/parse-xml)
[![Bundle size](https://badgen.net/bundlephobia/minzip/@rgrove/parse-xml)](https://bundlephobia.com/result?p=@rgrove/parse-xml)

## Contents

-   [Installation](#installation)
-   [Features](#features)
-   [Not Features](#not-features)
-   [Examples](#examples)
    -   [Basic Usage](#basic-usage)
    -   [Friendly Errors](#friendly-errors)
-   [API](#api)
-   [Nodes](#nodes)
    -   [`cdata`](#cdata)
    -   [`comment`](#comment)
    -   [`document`](#document)
    -   [`element`](#element)
    -   [`text`](#text)
-   [Why another XML parser?](#why-another-xml-parser)
-   [Benchmark](#benchmark)
-   [License](#license)

## Installation

```
npm install @rgrove/parse-xml
```

Or, if you like living dangerously, you can load [the minified UMD bundle][umd]
in a browser via [Unpkg][] and use the `parseXml` global.

[umd]:https://unpkg.com/@rgrove/parse-xml/dist/umd/parse-xml.min.js
[Unpkg]:https://unpkg.com/

## Features

-   Returns an [object tree](#basic-usage) representing an XML document.

-   Works great in Node.js 8+ and in modern browsers. Also works in older
    browsers if you provide polyfills for `Object.assign()`, `Object.freeze()`,
    and `String.fromCodePoint()`.

-   Provides [helpful, detailed error messages](#friendly-errors) with context
    when a document is not well-formed.

-   Mostly conforms to [XML 1.0 (Fifth Edition)](https://www.w3.org/TR/2008/REC-xml-20081126/)
    as a non-validating parser (see [below](#not-features) for details).

-   Passes all relevant tests in the [XML Conformance Test Suite](https://www.w3.org/XML/Test/).

-   It's [fast](#benchmark), [tiny](https://bundlephobia.com/result?p=@rgrove/parse-xml),
    and has no dependencies.

## Not Features

This parser is not a complete implementation of the XML specification because
parts of the spec aren't very useful or aren't safe when the XML being parsed
comes from an untrusted source. However, those parts of XML that _are_
implemented behave as defined in the spec.

The following XML features are ignored by the parser and are not exposed in the
document tree:

-   XML declarations
-   Document type definitions
-   Processing instructions

In addition, the only supported character encoding is UTF-8.

## Examples

### Basic Usage

```js
const parseXml = require('@rgrove/parse-xml');
parseXml('<kittens fuzzy="yes">I like fuzzy kittens.</kittens>');
```

**Output**

```js
{
  type: "document",
  children: [
    {
      type: "element",
      name: "kittens",
      attributes: {
        fuzzy: "yes"
      },
      children: [
        {
          type: "text",
          text: "I like fuzzy kittens."
        }
      ]
    }
  ]
}
```

### Friendly Errors

When something goes wrong, parse-xml throws an error that tells you exactly what
happened and shows you where the problem is so you can fix it.

```js
parseXml('<foo><bar>baz</foo>');
```

**Output**

```
Error: Missing end tag for element bar (line 1, column 14)
  <foo><bar>baz</foo>
               ^
```

In addition to a helpful message, error objects have the following properties:

-   **column** _Number_

    Column where the error occurred (1-based).

-   **excerpt** _String_

    Excerpt from the input string that contains the problem.

-   **line** _Number_

    Line where the error occurred (1-based).

-   **pos** _Number_

    Character position where the error occurred relative to the beginning of the
    input (0-based).

## API

### `parseXml(xml: string, options?: object) => object`

Parses an XML document and returns an object tree.

#### Options

The following options may be provided as properties of the `options` argument:

-   **ignoreUndefinedEntities** _Boolean_ (default: `false`)

    When `true`, an undefined named entity like `&bogus;` will be left as is
    instead of causing a parse error.

-   **preserveCdata** _Boolean_ (default: `false`)

    When `true`, CDATA sections will be preserved in the document tree as nodes
    of type `cdata`. Otherwise CDATA sections will be represented as nodes of
    type `text`.

-   **preserveComments** _Boolean_ (default: `false`)

    When `true`, comments will be preserved in the document tree as nodes of
    type `comment`. Otherwise comments will not be included in the document
    tree.

-   **resolveUndefinedEntity** _Function_

    When an undefined named entity is encountered, this function will be called
    with the entity as its only argument. It should return a string value with
    which to replace the entity, or `null` or `undefined` to treat the entity as
    undefined (which may result in a parse error depending on the value of
    `ignoreUndefinedEntities`).

## Nodes

An XML document is parsed into a tree of node objects. Each node has the
following common properties:

-   **parent** _Object?_

    Reference to this node's parent node, or `null` if this node is the
    `document` node (which has no parent).

-   **type** _String_

    Node type.

Each node also has a `toJSON()` method that returns a serializable
representation of the node without the `parent` property (in order to avoid
circular references). This means you can safely pass any node to
`JSON.stringify()` to serialize it and its children as JSON.

### `cdata`

A CDATA section. Only emitted when the `preserveCdata` option is `true` (by
default, CDATA sections become `text` nodes).

#### Properties


-   **text** _String_

    Unescaped text content of the CDATA section.

#### Example

```xml
<![CDATA[kittens are fuzzy & cute]]>
```

```js
{
  type: "cdata",
  text: "kittens are fuzzy & cute",
  parent: { ... }
}
```

### `comment`

A comment. Only emitted when the `preserveComments` option is `true`.

#### Properties

-   **content** _String_

    Comment text.

#### Example

```xml
<!-- I'm a comment! -->
```

```js
{
  type: "comment",
  content: "I'm a comment!",
  parent: { ... }
}
```

### `document`

The top-level node of an XML document.

#### Properties

-   **children** _Object[]_

    Array of child nodes.

#### Example

```xml
<root />
```

```js
{
  type: "document",
  children: [
    {
      type: "element",
      name: "root",
      attributes: {},
      children: [],
      parent: { ... }
    }
  ],
  parent: null
}
```

### `element`

An element.

Note that since parse-xml doesn't implement [XML Namespaces](https://www.w3.org/TR/REC-xml-names/),
no special treatment is given to namespace prefixes in element and attribute
names.

In other words, `<foo:bar foo:baz="quux" />` will result in the element name
"foo:bar" and the attribute name "foo:baz".

#### Properties

-   **attributes** _Object_

    Hash of attribute names to values.

    Attribute names in this object are always in alphabetical order regardless
    of their order in the document, and values are normalized and unescaped.
    Values are always strings.

-   **children** _Object[]_

    Array of child nodes.

-   **name** _String_

    Name of the element as given in the start and/or end tags.

-   **preserveWhitespace** _Boolean?_

    This property will be set to `true` if the special
    [`xml:space`](https://www.w3.org/TR/2008/REC-xml-20081126/#sec-white-space)
    attribute on this element or on the closest parent with an `xml:space`
    attribute has the value "preserve". This indicates that whitespace in the
    text content of this element should be preserved rather than normalized.

    If neither this element nor any of its ancestors has an `xml:space`
    attribute set to "preserve", or if the closest `xml:space` attribute is set
    to "default", this property will not be defined.

#### Example

```xml
<kittens description="fuzzy &amp; cute">I &lt;3 kittens</kittens>
```

```js
{
  type: "element",
  name: "kittens",
  attributes: {
    description: "fuzzy & cute"
  },
  children: [
    {
      type: "text",
      text: "I <3 kittens",
      parent: { ... }
    }
  ],
  parent: { ... }
}
```

### `text`

Text content inside an element.

#### Properties

-   **text** _String_

    Unescaped text content.

#### Example

```xml
kittens are fuzzy &amp; cute
```

```js
{
  type: "text"
  text: "kittens are fuzzy & cute",
  parent: { ... }
}
```

## Why another XML parser?

There are many XML parsers for Node, and some of them are good. However, most of
them suffer from one or more of the following shortcomings:

-   Native dependencies.

-   Loose, non-standard, "works for me" parsing behavior that can lead to
    unexpected or even unsafe results when given input the author didn't
    anticipate.

-   Kitchen sink APIs that tightly couple a parser with DOM manipulation
    functions, a stringifier, or other tooling that isn't directly related to
    parsing.

-   Stream-based parsing. This is great in the rare case that you need to parse
    truly enormous documents, but can be a pain to work with when all you want
    is an object tree.

-   Poor error handling.

-   Too big or too Node-specific to work well in browsers.

parse-xml's goal is to be a small, fast, safe, reasonably compliant,
non-streaming, non-validating, browser-friendly parser, because I think this is
an under-served niche.

I think parse-xml demonstrates that it's not necessary to jettison the spec
entirely or to write complex code in order to implement a small, fast XML
parser.

Also, it was fun.

## Benchmark

Here's how parse-xml stacks up against two comparable libraries, [libxmljs2]
(which is based on the native libxml library) and [xmldoc] (which is based on
[sax-js]).

[libxmljs2]:https://github.com/marudor/libxmljs2
[sax-js]:https://github.com/isaacs/sax-js
[xmldoc]:https://github.com/nfarina/xmldoc

```
Node.js v12.16.3 / Darwin x64
Intel(R) Core(TM) i7-6920HQ CPU @ 2.90GHz

Running "Small document (291 bytes)" suite...

  @rgrove/parse-xml 2.0.4:
    74 904 ops/s, ±0.59%   | fastest

  libxmljs2 0.25.3 (native):
    29 890 ops/s, ±4.15%   | 60.1% slower

  xmldoc 1.1.2 (sax-js):
    26 659 ops/s, ±0.67%   | slowest, 64.41% slower

Finished 3 cases!
  Fastest: @rgrove/parse-xml 2.0.4
  Slowest: xmldoc 1.1.2 (sax-js)

Running "Medium document (72081 bytes)" suite...

  @rgrove/parse-xml 2.0.4:
    455 ops/s, ±0.41%   | 53.76% slower

  libxmljs2 0.25.3 (native):
    984 ops/s, ±6.42%   | fastest

  xmldoc 1.1.2 (sax-js):
    184 ops/s, ±0.75%   | slowest, 81.3% slower

Finished 3 cases!
  Fastest: libxmljs2 0.25.3 (native)
  Slowest: xmldoc 1.1.2 (sax-js)

Running "Large document (1162464 bytes)" suite...

  @rgrove/parse-xml 2.0.4:
    36 ops/s, ±1.68%   | 41.94% slower

  libxmljs2 0.25.3 (native):
    62 ops/s, ±13.04%   | fastest

  xmldoc 1.1.2 (sax-js):
    15 ops/s, ±0.67%   | slowest, 75.81% slower

Finished 3 cases!
  Fastest: libxmljs2 0.25.3 (native)
  Slowest: xmldoc 1.1.2 (sax-js)
```

See the [parse-xml-benchmark](https://github.com/rgrove/parse-xml-benchmark)
repo for instructions on running this benchmark yourself.

## License

[ISC License](LICENSE)
