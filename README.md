# parse-xml

A fast, safe, compliant XML parser for Node.js and browsers.

[![npm version](https://badge.fury.io/js/%40rgrove%2Fparse-xml.svg)](https://badge.fury.io/js/%40rgrove%2Fparse-xml)
[![Bundle size](https://badgen.net/bundlephobia/minzip/@rgrove/parse-xml)](https://bundlephobia.com/result?p=@rgrove/parse-xml)
[![Test & Lint](https://github.com/rgrove/parse-xml/workflows/Test%20&%20Lint/badge.svg)](https://github.com/rgrove/parse-xml/actions?query=workflow%3A%22Test+%26+Lint%22)

## Contents

-   [Installation](#installation)
-   [Features](#features)
-   [Not Features](#not-features)
-   [API](#api)
-   [Examples](#examples)
    -   [Basic Usage](#basic-usage)
    -   [Friendly Errors](#friendly-errors)
-   [Why another XML parser?](#why-another-xml-parser)
-   [Benchmark](#benchmark)
-   [License](#license)

## Installation

```
npm install @rgrove/parse-xml
```

Or, if you like living dangerously, you can load [the minified UMD bundle][umd]
in a browser via [Unpkg] and use the `parseXml` global.

[umd]:https://unpkg.com/@rgrove/parse-xml/dist/umd/parse-xml.min.js
[Unpkg]:https://unpkg.com/

## Features

-   Returns an [object tree](#basic-usage) representing an XML document.

-   Works great in Node.js and in modern browsers.

-   Provides [helpful, detailed error messages](#friendly-errors) with context
    when a document is not well-formed.

-   Mostly conforms to [XML 1.0 (Fifth Edition)](https://www.w3.org/TR/2008/REC-xml-20081126/)
    as a non-validating parser (see [below](#not-features) for details).

-   Passes all relevant tests in the [XML Conformance Test Suite](https://www.w3.org/XML/Test/).

-   It's [fast](#benchmark), [small](https://bundlephobia.com/result?p=@rgrove/parse-xml),
    and has no dependencies.

## Not Features

This parser currently discards document type declarations (`<!DOCTYPE ... >`)
and all their contents, because they're rarely useful and some of their features
aren't safe when the XML being parsed comes from an untrusted source.

In addition, the only supported character encoding is UTF-8 because it's not
feasible (or useful) to suppport other character encodings in JavaScript.

## API

See [API.md](API.md) for complete API docs.

## Examples

### Basic Usage

```js
const parseXml = require('@rgrove/parse-xml');
let doc = parseXml('<kittens fuzzy="yes">I like fuzzy kittens.</kittens>');
```

The result is an [`XmlDocument`] instance containing the parsed document, with a
structure that looks like this (some properties and methods are excluded for
clarity; see the [API docs](API.md) for details):

```js
{
  type: 'document',
  children: [
    {
      type: 'element',
      name: 'kittens',
      attributes: {
        fuzzy: 'yes'
      },
      children: [
        {
          type: 'text',
          text: 'I like fuzzy kittens.'
        }
      ],
      parent: { ... },
      isRootNode: true
    }
  ]
}
```

[`XmlDocument`]:API.md#xmldocument

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

## Why another XML parser?

There are many XML parsers for Node, and some of them are good. However, most of
them suffer from one or more of the following shortcomings:

-   Native dependencies.

-   Loose, non-standard parsing behavior that can lead to unexpected or even
    unsafe results when given input the author didn't anticipate.

-   Kitchen sink APIs that tightly couple a parser with DOM manipulation
    functions, a stringifier, or other tooling that isn't directly related to
    parsing and consuming XML.

-   Stream-based parsing. This is great in the rare case that you need to parse
    truly enormous documents, but can be a pain to work with when all you want
    is a node tree.

-   Poor error handling.

-   Too big or too Node-specific to work well in browsers.

parse-xml's goal is to be a small, fast, safe, compliant, non-streaming,
non-validating, browser-friendly parser, because I think this is an under-served
niche.

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
Node.js v14.15.4 / Darwin x64
Intel(R) Core(TM) i7-6920HQ CPU @ 2.90GHz

Running "Small document (291 bytes)" suite...
Progress: 100%

  @rgrove/parse-xml 3.0.0:
    77 109 ops/s, ±0.46%   | fastest

  libxmljs2 0.26.6 (native):
    29 480 ops/s, ±4.62%   | slowest, 61.77% slower

  xmldoc 1.1.2 (sax-js):
    36 035 ops/s, ±0.62%   | 53.27% slower

Finished 3 cases!
  Fastest: @rgrove/parse-xml 3.0.0
  Slowest: libxmljs2 0.26.6 (native)

Running "Medium document (72081 bytes)" suite...
Progress: 100%

  @rgrove/parse-xml 3.0.0:
    321 ops/s, ±0.99%   | 54.34% slower

  libxmljs2 0.26.6 (native):
    703 ops/s, ±10.64%   | fastest

  xmldoc 1.1.2 (sax-js):
    235 ops/s, ±0.50%   | slowest, 66.57% slower

Finished 3 cases!
  Fastest: libxmljs2 0.26.6 (native)
  Slowest: xmldoc 1.1.2 (sax-js)

Running "Large document (1162464 bytes)" suite...
Progress: 100%

  @rgrove/parse-xml 3.0.0:
    20 ops/s, ±0.48%   | 72.97% slower

  libxmljs2 0.26.6 (native):
    74 ops/s, ±12.02%   | fastest

  xmldoc 1.1.2 (sax-js):
    19 ops/s, ±1.68%   | slowest, 74.32% slower

Finished 3 cases!
  Fastest: libxmljs2 0.26.6 (native)
  Slowest: xmldoc 1.1.2 (sax-js)
```

See the [parse-xml-benchmark](https://github.com/rgrove/parse-xml-benchmark)
repo for instructions on running this benchmark yourself.

## License

[ISC License](LICENSE)
