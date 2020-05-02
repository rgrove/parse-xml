# parse-xml changelog

All notable changes to parse-xml are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). This project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.0.4 (2020-05-01)

### Fixed

-   Extremely long attribute values no longer cause the parser to throw a
    "Maximum call stack size exceeded" `RangeError`. [#13] (@rossj)

[#13]:https://github.com/rgrove/parse-xml/pull/13

## 2.0.3 (2020-04-20)

### Fixed

-   Attribute values with many consecutive character references (such as `&lt;`)
    no longer cause the parser to hang. [#10] (@rossj)

[#10]:https://github.com/rgrove/parse-xml/pull/10

## 2.0.2 (2020-01-10)

### Fixed

-   Whitespace in attribute values is now normalized correctly. [#7]

    Previously, attribute values were normalized according to the rules for
    non-CDATA attributes, but this was incorrect and based on a misreading of
    the spec.

    Attribute values are now correctly parsed as CDATA, meaning that whitespace
    is not collapsed or trimmed and whitespace character entities are resolved
    to their respective characters rather than being normalized to spaces (which
    was incorrect even by the non-CDATA rules!).

[#7]:https://github.com/rgrove/parse-xml/pull/7

## 2.0.1 (2019-04-09)

### Fixed

-   A carriage return (`\r`) character that isn't followed by a line feed (`\n`)
    character is now [correctly normalized][xml-line-ends] to a line feed before
    parsing.

[xml-line-ends]:https://www.w3.org/TR/2008/REC-xml-20081126/#sec-line-ends

## 2.0.0 (2019-01-20)

### Added

-   There's a new minified UMD bundle at `dist/umd/parse-xml.min.js` in the npm
    package. This may be useful if you want to load parse-xml directly in a
    browser using a service like
    [unpkg](https://unpkg.com/@rgrove/parse-xml/dist/umd/parse-xml.min.js) or
    [jsDelivr](https://cdn.jsdelivr.net/npm/@rgrove/parse-xml/dist/umd/parse-xml.min.js).

### Changed

-   parse-xml no longer depends on CoreJS polyfills or the Babel runtime, which
    reduces the browser bundle size significantly. If you need to support older
    browsers, you should provide your own polyfills for `Object.assign()`,
    `Object.freeze()`, and `String.fromCodePoint()`.

-   The browser-friendly CommonJS build has moved from `dist/` to
    `dist/commonjs/` in the npm package.

## 1.1.1 (2017-09-20)

### Fixed

-   Attribute values are no longer truncated at the first `=` character.

## 1.1.0 (2017-09-10)

### Added

-   New parsing option `resolveUndefinedEntity`. [#2]
    ([@retorquere](https://github.com/retorquere))

[#2]:https://github.com/rgrove/parse-xml/pull/2

## 1.0.0 (2017-06-04)

-   Initial release.
