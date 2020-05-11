'use strict';

const XmlNode = require('./XmlNode');
const XmlText = require('./XmlText');

/**
A CDATA section within an XML document.

@public
*/
class XmlCdata extends XmlText {
  get type() {
    return XmlNode.TYPE_CDATA;
  }
}

module.exports = XmlCdata;
