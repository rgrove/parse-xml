'use strict';

const Parser = require('./lib/Parser');
const XmlCdata = require('./lib/XmlCdata');
const XmlComment = require('./lib/XmlComment');
const XmlDocument = require('./lib/XmlDocument');
const XmlElement = require('./lib/XmlElement');
const XmlNode = require('./lib/XmlNode');
const XmlProcessingInstruction = require('./lib/XmlProcessingInstruction');
const XmlText = require('./lib/XmlText');

/**
Parses the given XML string and returns an `XmlDocument` instance representing
the document tree.

@example

  const parseXml = require('@rgrove/parse-xml');
  let doc = parseXml('<kittens fuzzy="yes">I like fuzzy kittens.</kittens>');

@param {string} xml
  XML string to parse.

@param {object} [options]
  Parsing options.

  @param {boolean} [options.ignoreUndefinedEntities=false]
    When `true`, an undefined named entity (like "&bogus;") will be left in the
    output as is instead of causing a parse error.

  @param {boolean} [options.preserveCdata=false]
    When `true`, CDATA sections will be preserved in the document as `XmlCdata`
    nodes. Otherwise CDATA sections will be represented as `XmlText` nodes,
    which keeps the node tree simpler and easier to work with.

  @param {boolean} [options.preserveComments=false]
    When `true`, comments will be preserved in the document as `XmlComment`
    nodes. Otherwise comments will not be included in the node tree.

  @param {(entity: string) => string?} [options.resolveUndefinedEntity]
    When an undefined named entity is encountered, this function will be called
    with the entity as its only argument. It should return a string value with
    which to replace the entity, or `null` or `undefined` to treat the entity as
    undefined (which may result in a parse error depending on the value of
    `ignoreUndefinedEntities`).

  @param {boolean} [options.sortAttributes=false]
    When `true`, attributes in an element's `attributes` object will be sorted
    in alphanumeric order by name. Otherwise they'll retain their original order
    as found in the XML.

@returns {XmlDocument}
@public
*/
function parseXml(xml, options) {
  return (new Parser(xml, options)).document;
}

parseXml.XmlCdata = XmlCdata;
parseXml.XmlComment = XmlComment;
parseXml.XmlDocument = XmlDocument;
parseXml.XmlElement = XmlElement;
parseXml.XmlNode = XmlNode;
parseXml.XmlProcessingInstruction = XmlProcessingInstruction;
parseXml.XmlText = XmlText;

module.exports = parseXml;
