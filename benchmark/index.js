/* globals bench, set, suite */
'use strict';

const fs = require('fs');
const libxmljs = require('libxmljs');
const os = require('os');
const xmldoc = require('xmldoc');

const parseXml = require('../src');

console.log(`Node.js ${process.version} / ${os.type()} ${os.arch()}\n${os.cpus()[0].model}`);

[
  {
    name: 'Small document',
    filename: `${__dirname}/fixtures/small.xml`
  },

  {
    name: 'Medium document',
    filename: `${__dirname}/fixtures/medium.xml`
  },

  {
    name: 'Large document',
    filename: `${__dirname}/fixtures/large.xml`
  }
].forEach(({ filename, name }) => {
  let xml = fs.readFileSync(filename, { encoding: 'utf8' });

  suite(`${name} (${xml.length} bytes)`, () => {
    set('delay', 100);

    bench('libxmljs (native)', () => {
      libxmljs.parseXml(xml);
    });

    bench('parse-xml', () => {
      parseXml(xml);
    });

    bench('xmldoc (sax-js)', () => {
      new xmldoc.XmlDocument(xml);
    });
  });
});
