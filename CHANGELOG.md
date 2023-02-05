# parse-xml changelog

All notable changes to parse-xml are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 4.1.0 (2023-02-04)

### Added

-   Added a new `includeOffsets` parser option. [#25](https://github.com/rgrove/parse-xml/pull/25)

    When `true`, the starting and ending byte offsets of each node in the input string will be made available via `start` and `end` properties on the node. The default is `false`.

    This option is useful if you want to preserve the original source text of each node when later serializing a document back to XML. Previously, the original source text was always discarded, which meant that if you parsed a document and then serialized it, the original source text would be lost.

    ```js
    const { parseXml } = require('@rgrove/parse-xml');

    let xml = '<root><child /></root>';
    let doc = parseXml(xml, { includeOffsets: true });

    console.log(doc.root.toJSON());
    // => { type: 'element', name: 'root', start: 0, end: 22, ... }

    console.log(doc.root.children[0].toJSON());
    // => { type: 'element', name: 'child', start: 6, end: 15, ... }
    ```

-   Added a new `preserveXmlDeclaration` parser option. [#31](https://github.com/rgrove/parse-xml/pull/31)

    When `true`, an `XmlDeclaration` node representing the XML declaration (if there is one) will be included in the parsed document. When `false`, the XML declaration will be discarded. The default is `false`, which matches the behavior of previous versions.

    This option is useful if you want to preserve the XML declaration when later serializing a document back to XML. Previously, the XML declaration was always discarded, which meant that if you parsed a document with an XML declaration and then serialized it, the original XML declaration would be lost.

    ```js
    const { parseXml } = require('@rgrove/parse-xml');

    let xml = '<?xml version="1.0" encoding="UTF-8"?><root />';
    let doc = parseXml(xml, { preserveXmlDeclaration: true });

    console.log(doc.children[0].toJSON());
    // => { type: 'xmldecl', version: '1.0', encoding: 'UTF-8' }
    ```

-   Added a new `preserveDocumentType` parser option. [#32](https://github.com/rgrove/parse-xml/pull/32)

    When `true`, an `XmlDocumentType` node representing a document type declaration (if there is one) will be included in the parsed document. When `false`, any document type declaration encountered will be discarded. The default is `false`, which matches the behavior of previous versions.

    Note that the parser only includes the document type declaration in the node tree; it doesn't actually validate the document against the DTD, load external DTDs, or resolve custom entity references.

    This option is useful if you want to preserve the document type declaration when later serializing a document back to XML. Previously, the document type declaration was always discarded, which meant that if you parsed a document with a document type declaration and then serialized it, the original document type declaration would be lost.

    ```js
    const { parseXml } = require('@rgrove/parse-xml');

    let xml = '<!DOCTYPE root SYSTEM "root.dtd"><root />';
    let doc = parseXml(xml, { preserveDocumentType: true });

    console.log(doc.children[0].toJSON());
    // => { type: 'doctype', name: 'root', systemId: 'root.dtd' }

    xml = '<!DOCTYPE kittens [<!ELEMENT kittens (#PCDATA)>]><kittens />';
    doc = parseXml(xml, { preserveDocumentType: true });

    console.log(doc.children[0].toJSON());
    // => {
    //   type: 'doctype',
    //   name: 'kittens',
    //   internalSubset: '<!ELEMENT kittens (#PCDATA)>'
    // }
    ```

### Changed

-   Errors thrown by the parser are now instances of a new `XmlError` class, which extends `Error`. These errors still have all the same properties as before, but now with improved type definitions. [#27](https://github.com/rgrove/parse-xml/issues/27)

### Fixed

-   Leading and trailing whitespace in comment content is no longer trimmed. This issue only affected parsing when the `preserveComments` parser option was enabled. [#28](https://github.com/rgrove/parse-xml/issues/28)

-   Text content following a CDATA section is no longer appended to the preceding `XmlCdata` node. This issue only affected parsing when the `preserveCdata` parser option was enabled. [#29](https://github.com/rgrove/parse-xml/issues/29)

## 4.0.1 (2022-10-17)

### Fixed

-   The `parseXml()` function's `options` argument is now correctly marked as optional. [[#23](https://github.com/rgrove/parse-xml/issues/23)]

## 4.0.0 (2022-09-25)

parse-xml has been rewritten in TypeScript. The API is unchanged, but the `parseXml()` function is now a named export rather than a default export, which will require a small change to how you import it. See below for details.

This release also contains major performance improvements. Parsing is now 1.4x to 2.5x as fast as it was in 3.0.0, depending on the document being parsed.

### Breaking Changes

-   The `parseXml()` function is now a named export rather than the default export. Please update your `import` and `require` statements accordingly:

    **ESM**

    ```diff
    -import parseXml from '@rgrove/parse-xml';
    +import { parseXml } from '@rgrove/parse-xml';
    ```

    **CommonJS**

    ```diff
    -const parseXml = require('@rgrove/parse-xml');
    +const { parseXml } = require('@rgrove/parse-xml');
    ```

-   XML node classes (`XmlNode`, `XmlDocument`, `XmlElement`, etc.) are now named exports of the `@rgrove/parse-xml` package rather than properties on the `parseXml()` function. This is unlikely to affect most people since there aren't many reasons to use these classes directly.

    **ESM**

    ```diff
    -import parseXml from '@rgrove/parse-xml';
    -const { XmlNode } = parseXml;
    +import { parseXml, XmlNode } from '@rgrove/parse-xml';
    ```

    **CommonJS**

    ```diff
    -const parseXml = require('@rgrove/parse-xml');
    -const { XmlNode } = parseXml;
    +const { parseXml, XmlNode } = require('@rgrove/parse-xml');
    ```

-   The minified browser-ready global bundle, which was previously located at `dist/umd/parse-xml.min.js`, is now located at `dist/global.min.js`. This is unlikely to affect most people because this file isn't used by Node.js or by browser bundlers like webpack. It's only a convenience for people who want to load parse-xml directly from a CDN like unpkg with a `<script>` element and use it via a `parseXml()` global.

    ```diff
    -<script src="https://unpkg.com/@rgrove/parse-xml@3.0.0/dist/umd/parse-xml.min.js"></script>
    +<script src="https://unpkg.com/@rgrove/parse-xml@4.0.0/dist/global.min.js"></script>
    ```

-   Node.js 12 is no longer supported. Node.js 14 is now the minimum supported version.

### Other Changes

-   Parsing performance has been improved significantly, and is now 1.4 to 2.5 times as fast as it was in 3.0.0, depending on the document being parsed.

-   The package now includes a browser-specific entry point that's optimized for minification. Using parse-xml with a minifying bundler like webpack or esbuild should now result in a smaller bundle.

## 3.0.0 (2021-01-23)

This release includes significant changes under the hood (such as a brand new parser!), but backwards compatibility has been a high priority. Most users should be able to upgrade without needing to make any changes (or with only minimal changes).

### Added

-   XML processing instructions are now included in parsed documents as `XmlProcessingInstruction` nodes (with the `type` value "pi"). Previously they were discarded.

-   A new `sortAttributes` option. When `true`, attributes will be sorted in alphabetical order in an element's `attributes` object (which is no longer the default behavior).

-   TypeScript type definitions. While parse-xml is still written in JavaScript, it now has TypeScript-friendly JSDoc comments throughout, with strict type checking enabled. These comments are now used to generate type definitions at build time.

### Changed

-   The minimum supported Node.js version is now 12.x, and the minimum supported ECMAScript version is ES2017. Extremely old browsers (like IE11) are no longer supported out of the box, but you can still transpile parse-xml yourself if you need to support old browsers.

-   The XML parser has been completely rewritten with the primary goals of improving robustness and safety.

    While the previous parser was good, it relied heavily on complex regular expressions. This helped keep it extremely small, but also left it open to the possibility of regex denial of service bugs when parsing unusual or maliciously crafted input.

    The new parser uses a less interesting but overall safer approach, and employs regular expressions only sparingly and in ways that aren't risky (they're now only used as performance optimizations rather than as the basis for the entire parser).

-   The `parseXml()` function now returns an `XmlDocument` instance instead of a plain object. Its properties are backwards compatible.

-   Other node types (elements, text nodes, CDATA nodes, and comments) are also now represented by class instances (`XmlElement`, `XmlText`, `XmlCdata`, and `XmlComment`) rather than plain objects. Their properties are all backwards compatible.

-   Attributes are no longer sorted alphabetically by name in an element's `attributes` object by default. They're now defined in the same order that they're encountered in the document being parsed, unless the `sortAttributes` parser option is `true`.

-   If the value returned by an optional `resolveUndefinedEntity` function is not a string, `null`, or `undefined`, a `TypeError` will now be thrown. If you don't pass a custom `resolveUndefinedEntity` function to `parseXml()`, then this change won't affect you.

-   Some error messages have been changed to improve clarity, and more helpful errors have been added in some scenarios that previously would have resulted in generic or less helpful errors.

-   The `browser` field in `package.json` has been removed and the `main` field now points both Node.js and browser bundlers to the same untranspiled CommonJS source.

    When bundled using your favorite bundler, parse-xml will work great in all modern browsers with no transpilation needed. If you don't want to use a bundler, you can still use the prepackaged UMD bundle at `dist/umd/parse-xml.min.js`, which provides a `parseXml` global.

## 2.0.4 (2020-05-01)

### Fixed

-   Extremely long attribute values no longer cause the parser to throw a "Maximum call stack size exceeded" `RangeError`. [#13] (@rossj)

[#13]:https://github.com/rgrove/parse-xml/pull/13

## 2.0.3 (2020-04-20)

### Fixed

-   Attribute values with many consecutive character references (such as `&lt;`) no longer cause the parser to hang. [#10] (@rossj)

[#10]:https://github.com/rgrove/parse-xml/pull/10

## 2.0.2 (2020-01-10)

### Fixed

-   Whitespace in attribute values is now normalized correctly. [#7]

    Previously, attribute values were normalized according to the rules for non-CDATA attributes, but this was incorrect and based on a misreading of the spec.

    Attribute values are now correctly parsed as CDATA, meaning that whitespace is not collapsed or trimmed and whitespace character entities are resolved to their respective characters rather than being normalized to spaces (which was incorrect even by the non-CDATA rules!).

[#7]:https://github.com/rgrove/parse-xml/pull/7

## 2.0.1 (2019-04-09)

### Fixed

-   A carriage return (`\r`) character that isn't followed by a line feed (`\n`) character is now [correctly normalized][xml-line-ends] to a line feed before parsing.

[xml-line-ends]:https://www.w3.org/TR/2008/REC-xml-20081126/#sec-line-ends

## 2.0.0 (2019-01-20)

### Added

-   There's a new minified UMD bundle at `dist/umd/parse-xml.min.js` in the npm package. This may be useful if you want to load parse-xml directly in a browser using a service like [unpkg](https://unpkg.com/@rgrove/parse-xml/dist/umd/parse-xml.min.js) or [jsDelivr](https://cdn.jsdelivr.net/npm/@rgrove/parse-xml/dist/umd/parse-xml.min.js).

### Changed

-   parse-xml no longer depends on CoreJS polyfills or the Babel runtime, which reduces the browser bundle size significantly. If you need to support older browsers, you should provide your own polyfills for `Object.assign()`, `Object.freeze()`, and `String.fromCodePoint()`.

-   The browser-friendly CommonJS build has moved from `dist/` to `dist/commonjs/` in the npm package.

## 1.1.1 (2017-09-20)

### Fixed

-   Attribute values are no longer truncated at the first `=` character.

## 1.1.0 (2017-09-10)

### Added

-   New parsing option `resolveUndefinedEntity`. [#2] ([@retorquere](https://github.com/retorquere))

[#2]:https://github.com/rgrove/parse-xml/pull/2

## 1.0.0 (2017-06-04)

-   Initial release.
