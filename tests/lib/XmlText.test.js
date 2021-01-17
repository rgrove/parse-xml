/* eslint-env mocha */
'use strict';

const assert = require('assert');
const parseXml = require('../../src');

const { XmlText } = parseXml;

describe('`XmlText`', () => {
  let xml;

  beforeEach(() => {
    xml = `<root> foo &amp;  bar\r\nbaz </root>`;
  });

  it('is emitted', () => {
    let { root } = parseXml(xml);
    let [ textNode ] = root.children;

    assert(textNode instanceof XmlText);
    assert.strictEqual(textNode.text, ' foo &  bar\nbaz ');
  });
});
