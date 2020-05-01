'use strict';

// To improve readability, the regular expression patterns in this file are
// written as tagged template literals. The `regex` tag function strips literal
// whitespace characters and line comments beginning with `//` and returns a
// RegExp instance.
//
// Escape sequences are preserved as-is in the resulting regex, so
// double-escaping isn't necessary. A pattern may embed another pattern using
// `${}` interpolation.

// -- Common Symbols -----------------------------------------------------------
exports.Char = regex`
  (?:
    [
      \t
      \n
      \r
      \x20-\uD7FF
      \uE000-\uFFFD
    ]

    |

    [\uD800-\uDBFF][\uDC00-\uDFFF]
  )
`;

// Partial implementation.
//
// To be compliant, the matched text must result in an error if it contains the
// string `]]>`, but that can't be easily represented here so we do it in the
// parser.
exports.CharData = regex`
  [^<&]+
`;

exports.NameStartChar = regex`
  (?:
    [
      :
      A-Z
      _
      a-z
      \xC0-\xD6
      \xD8-\xF6
      \xF8-\u02FF
      \u0370-\u037D
      \u037F-\u1FFF
      \u200C-\u200D
      \u2070-\u218F
      \u2C00-\u2FEF
      \u3001-\uD7FF
      \uF900-\uFDCF
      \uFDF0-\uFFFD
    ]

    |

    [\uD800-\uDB7F][\uDC00-\uDFFF]
  )
`;

exports.NameChar = regex`
  (?:
    ${exports.NameStartChar}

    |

    [
      .
      0-9
      \xB7
      \u0300-\u036F
      \u203F-\u2040
      -
    ]
  )
`;

exports.Name = regex`
  ${exports.NameStartChar}
  (?:${exports.NameChar})*
`;

// Loose implementation. The entity will be validated in the `replaceReference`
// function.
exports.Reference = regex`
  &[^\s&;]*;?
`;

exports.S = regex`
  [\x20\t\r\n]+
`;

// -- Attributes ---------------------------------------------------------------
exports.Eq = regex`
  (?:${exports.S})?
  =
  (?:${exports.S})?
`;

exports.Attribute = regex`
  ${exports.Name}
  ${exports.Eq}

  (?:
    "(?:
      [^<"]
    )*"

    |

    '(?:
      [^<']
    )*'
  )
`;

// -- Elements -----------------------------------------------------------------
exports.CDSect = regex`
  <!\[CDATA\[
    // Group 1: CData text content (optional)
    (
      (?:${exports.Char})*?
    )
  \]\]>
`;

exports.EmptyElemTag = regex`
  <
    // Group 1: Element name
    (${exports.Name})

    // Group 2: Attributes (optional)
    (
      (?:
        ${exports.S}
        ${exports.Attribute}
      )*
    )

    (?:${exports.S})?
  />
`;

exports.ETag = regex`
  </
    // Group 1: End tag name
    (${exports.Name})
    (?:${exports.S})?
  >
`;

exports.STag = regex`
  <
    // Group 1: Start tag name
    (${exports.Name})

    // Group 2: Attributes (optional)
    (
      (?:
        ${exports.S}
        ${exports.Attribute}
      )*
    )

    (?:${exports.S})?
  >
`;

// -- Misc ---------------------------------------------------------------------

// Special pattern that matches an entire string consisting only of `Char`
// characters.
exports.CharOnly = regex`
  ^(?:${exports.Char})*$
`;

exports.Comment = regex`
  <!--
    // Group 1: Comment text (optional)
    (
      (?:
        (?!-) ${exports.Char}
        | - (?!-) ${exports.Char}
      )*
    )
  -->
`;

// Loose implementation since doctype declarations are discarded.
//
// It's not possible to fully parse a doctype declaration with a regex, but
// since we just discard them we can skip parsing the fiddly inner bits and use
// a regex to speed things up.
exports.doctypedecl = regex`
  <!DOCTYPE
    ${exports.S}

    [^[>]*

    (?:
      \[ [\s\S]+? \]
      (?:${exports.S})?
    )?
  >
`;

// Loose implementation since processing instructions are discarded.
exports.PI = regex`
  <\?
    // Group 1: PITarget
    (
      ${exports.Name}
    )

    (?:
      ${exports.S}
      (?:${exports.Char})*?
    )?
  \?>
`;

// Loose implementation since XML declarations are discarded.
exports.XMLDecl = regex`
  <\?xml
    ${exports.S}
    [\s\S]+?
  \?>
`;

// -- Helpers ------------------------------------------------------------------
exports.Anchored = {};
exports.Global = {};

// Create anchored and global variations of each pattern.
Object.keys(exports).forEach(name => {
  if (name !== 'Anchored' && name !== 'CharOnly' && name !== 'Global') {
    let pattern = exports[name];

    exports.Anchored[name] = new RegExp('^' + pattern.source);
    exports.Global[name] = new RegExp(pattern.source, 'g');
  }
});

function regex(strings, ...embeddedPatterns) {
  let { length, raw } = strings;
  let lastIndex = length - 1;
  let pattern = '';

  for (let i = 0; i < length; ++i) {
    pattern += raw[i]
      .replace(/(^|[^\\])\/\/.*$/gm, '$1') // remove end-of-line comments
      .replace(/\s+/g, ''); // remove all whitespace

    if (i < lastIndex) {
      pattern += embeddedPatterns[i].source;
    }
  }

  return new RegExp(pattern);
}
