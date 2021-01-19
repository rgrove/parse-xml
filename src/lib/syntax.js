'use strict';

// -- Exported Constants -------------------------------------------------------

/**
Mapping of predefined entity names to their replacement values.

@type {Readonly<{[name: string]: string}>}
@see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-predefined-ent
*/
const predefinedEntities = Object.freeze(Object.assign(Object.create(null), {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"'
}));

exports.predefinedEntities = predefinedEntities;

// -- Exported Functions -------------------------------------------------------

/**
Returns `true` if _char_ is an XML `NameChar`, `false` if it isn't.

@param {string} char
@returns {boolean}
@see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-NameChar
*/
function isNameChar(char) {
  if (isNameStartChar(char)) {
    return true;
  }

  let cp = getCodePoint(char);

  return cp === 0x2D // -
    || cp === 0x2E // .
    || (cp >= 0x30 && cp <= 0x39) // 0-9
    || cp === 0xB7
    || (cp >= 0x300 && cp <= 0x36F)
    || (cp >= 0x203F && cp <= 0x2040);
}

exports.isNameChar = isNameChar;

/**
Returns `true` if _char_ is an XML `NameStartChar`, `false` if it isn't.

@param {string} char
@returns {boolean}
@see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-NameStartChar
*/
function isNameStartChar(char) {
  let cp = getCodePoint(char);

  return cp === 0x3A // :
    || cp === 0x5F // _
    || (cp >= 0x41 && cp <= 0x5A) // A-Z
    || (cp >= 0x61 && cp <= 0x7A) // a-z
    || (cp >= 0xC0 && cp <= 0xD6)
    || (cp >= 0xD8 && cp <= 0xF6)
    || (cp >= 0xF8 && cp <= 0x2FF)
    || (cp >= 0x370 && cp <= 0x37D)
    || (cp >= 0x37F && cp <= 0x1FFF)
    || (cp >= 0x200C && cp <= 0x200D)
    || (cp >= 0x2070 && cp <= 0x218F)
    || (cp >= 0x2C00 && cp <= 0x2FEF)
    || (cp >= 0x3001 && cp <= 0xD7FF)
    || (cp >= 0xF900 && cp <= 0xFDCF)
    || (cp >= 0xFDF0 && cp <= 0xFFFD)
    || (cp >= 0x10000 && cp <= 0xEFFFF);
}

exports.isNameStartChar = isNameStartChar;

/**
Returns `true` if _char_ is not a valid XML `Char`, `false` otherwise.

@param {string} char
@returns {boolean}
@see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Char
*/
function isNotXmlChar(char) {
  return !isXmlChar(char);
}

exports.isNotXmlChar = isNotXmlChar;

/**
Returns `true` if _char_ is a valid reference character (which may appear
between `&` and `;` in a reference), `false` otherwise.

@param {string} char
@returns {boolean}
@see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-references
*/
function isReferenceChar(char) {
  return char === '#' || isNameChar(char);
}

exports.isReferenceChar = isReferenceChar;

/**
Returns `true` if _char_ is an XML whitespace character, `false` otherwise.

@param {string} char
@returns {boolean}
@see https://www.w3.org/TR/2008/REC-xml-20081126/#white
*/
function isWhitespace(char) {
  let cp = getCodePoint(char);

  return cp === 0x20
    || cp === 0x9
    || cp === 0xA
    || cp === 0xD;
}

exports.isWhitespace = isWhitespace;

/**
Returns `true` if _char_ is a valid XML `Char`, `false` otherwise.

@param {string} char
@returns {boolean}
@see https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Char
*/
function isXmlChar(char) {
  let cp = getCodePoint(char);

  return cp === 0x9
    || cp === 0xA
    || cp === 0xD
    || (cp >= 0x20 && cp <= 0xD7FF)
    || (cp >= 0xE000 && cp <= 0xFFFD)
    || (cp >= 0x10000 && cp <= 0x10FFFF);
}

exports.isXmlChar = isXmlChar;

// -- Private Functions --------------------------------------------------------

/**
Returns the Unicode code point value of the given character, or `-1` if _char_
is empty.

@param {string} char
@returns {number}
*/
function getCodePoint(char) {
  return char.codePointAt(0) || -1;
}
