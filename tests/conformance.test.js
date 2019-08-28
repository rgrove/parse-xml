/* eslint-env mocha */
/* eslint-disable func-names */
'use strict';

const assert = require('assert');
const mapLimit = require('async/mapLimit');
const path = require('path');

const parseXml = require('../src');

const REPO_ROOT = path.resolve(__dirname, '..');
const XMLCONF_ROOT = path.resolve(__dirname, 'fixtures/xmlconf');

// -- Config -------------------------------------------------------------------

// Paths to test suite files, relative to `XMLCONF_ROOT`.
const testSuiteFiles = [
  'eduni/errata-2e/errata2e.xml',
  'eduni/errata-3e/errata3e.xml',
  'eduni/errata-4e/errata4e.xml',
  'eduni/misc/ht-bh.xml',
  'ibm/ibm_oasis_invalid.xml',
  'ibm/ibm_oasis_valid.xml',

  // Skipping because many tests for illegal chars don't actually contain the
  // characters they claim to contain. Possible encoding issues with the test
  // fixtures?
  //
  // 'ibm/ibm_oasis_not-wf.xml',

  'oasis/oasis.xml',

  // Skipping because the test case XML files themselves are not well-formed
  // XML and thus can't be parsed. ಠ_ಠ
  // 'sun/sun-error.xml',
  // 'sun/sun-invalid.xml',
  // 'sun/sun-not-wf.xml',
  // 'sun/sun-valid.xml',

  'xmltest/xmltest.xml',
];

// Names of spec sections whose tests should be skipped because we don't
// implement those parts of the spec.
const skipSections = [
  '2.3 [9]', // EntityValue
  '2.3 [11]', // SystemLiteral
  '2.3 [12]', // PubidLiteral
  '2.3 [13]', // PubidChar
  '2.8 [23]', // XMLDecl
  '2.8 [24]', // VersionInfo
  '2.8 [26]', // VersionNum
  '2.8 [28]', // doctypedecl
  '2.8 [29]', // DTD markupdecl
  '2.8 [30]', // extSubset
  '2.8 [31]', // extSubsetDecl
  '2.9', // Standalone Document Declaration
  '3.2', // Element Type Declarations
  '3.3', // Attribute-List Declarations
  '3.4', // Conditional Sections
  '4.1 [69]', // PEReference
  '4.2', // Entity Declarations
  '4.3', // Parsed Entities
  '4.4.8', // parameter entities
];

// Ids of tests that should be skipped because they require functionality that
// our parser intentionally doesn't implement (mostly DTD-related).
const skipTests = new Set([
  'not-wf-sa-078', // entity declaration
  'not-wf-sa-079', // entity declaration
  'not-wf-sa-080', // entity declaration
  'not-wf-sa-084', // entity declaration
  'not-wf-sa-121', // entity declaration
  'not-wf-sa-128', // DTD
  'not-wf-sa-152', // XMLDecl version string
  'not-wf-sa-160', // entity declaration
  'not-wf-sa-161', // entity declaration
  'not-wf-sa-162', // entity declaration
  'not-wf-sa-168', // claims to test an illegal char, but tests the wrong char
  'not-wf-sa-169', // claims to test an illegal char, but tests the wrong char
  'not-wf-sa-170', // claims to test an illegal char, but tests the wrong char
  'not-wf-sa-173', // claims to test an illegal char, but tests the wrong char
  'not-wf-sa-175', // claims to test an illegal char, but tests the wrong char
  'not-wf-sa-179', // entity declaration
  'not-wf-sa-180', // entity declaration
  'o-p09fail3', // entity declaration
  'o-p09fail4', // entity declaration
  'o-p09fail5', // entity declaration
  'o-p25fail1', // VersionInfo (rec section in the test is incorrect)
  'rmt-e2e-27', // claims to test an illegal char, but tests the wrong char
  'rmt-e2e-34', // DTD
  'rmt-e2e-55', // DTD
  'rmt-e2e-61', // we don't support charsets other than UTF-8
  'rmt-e3e-12', // attribute-list declaration
  'valid-sa-044', // DTD
  'valid-sa-049', // test file is encoded as UTF-16 LE, which we don't support
  'valid-sa-050', // test file is encoded as UTF-16 LE, which we don't support
  'valid-sa-051', // test file is encoded as UTF-16 LE, which we don't support
  'valid-sa-094', // DTD
  'valid-sa-114', // entity declaration
  'x-ibm-1-0.5-not-wf-P04-ibm04n21.xml', // claims to test an illegal char, but tests the wrong char
  'x-ibm-1-0.5-not-wf-P04-ibm04n22.xml', // claims to test an illegal char, but tests the wrong char
  'x-ibm-1-0.5-not-wf-P04-ibm04n23.xml', // claims to test an illegal char, but tests the wrong char
  'x-ibm-1-0.5-not-wf-P04-ibm04n24.xml', // claims to test an illegal char, but tests the wrong char
  'x-ibm-1-0.5-not-wf-P04a-ibm04an21.xml', // claims to test an illegal char, but tests the wrong char
  'x-ibm-1-0.5-not-wf-P04a-ibm04an22.xml', // claims to test an illegal char, but tests the wrong char
  'x-ibm-1-0.5-not-wf-P04a-ibm04an23.xml', // claims to test an illegal char, but tests the wrong char
  'x-ibm-1-0.5-not-wf-P04a-ibm04an24.xml', // claims to test an illegal char, but tests the wrong char
  'x-rmt-008', // we don't currently parse XMLDecl version numbers
]);

// -- Tests --------------------------------------------------------------------
mapLimit(testSuiteFiles, 10, loadTestSuite, (err, testSuites) => {
  if (err) { throw err; }

  describe("XML conformance tests", () => {
    testSuites.forEach(suite => {
      let { doc, filename } = suite;

      let testRoot = path.dirname(filename);

      doc.children.forEach(node => {
        if (node.name === 'TESTCASES') {
          createTestCases(testRoot, node);
        }
      });
    });
  });

  run(); // <-- Mocha global, don't freak out
});

// -- Helpers ------------------------------------------------------------------
function createTest(testRoot, test) {
  let { attributes } = test;
  let rec = attributes.RECOMMENDATION || 'XML1.0';
  let version = attributes.VERSION || '1.0';

  if (!rec.startsWith('XML1.0') || !version.includes('1.0')) {
    // Skip tests that aren't for XML 1.0.
    return;
  }

  if (attributes.ENTITIES && attributes.ENTITIES !== 'none') {
    // Skip tests that require external entity support.
    return;
  }

  let sections = attributes.SECTIONS.split(/\s*,\s*/);

  if (skipTests.has(attributes.ID)
      || sections.some(section => skipSections.some(skip => section.startsWith(skip)))) {
    // Skip tests for unsupported functionality.
    return;
  }

  let description = getTextContent(test).trim();
  let inputPath = path.join(testRoot, attributes.URI);
  let inputPathRelative = path.relative(REPO_ROOT, inputPath);
  let inputXml;
  let outputPath;
  let outputPathRelative;
  let outputXml;

  if (attributes.OUTPUT) {
    outputPath = path.join(testRoot, attributes.OUTPUT);
    outputPathRelative = path.relative(REPO_ROOT, outputPath);
  }

  let prefix = `[${attributes.ID}] ${attributes.SECTIONS}:`;

  before(done => {
    readXml(inputPath, (err, xml) => {
      if (err) { return void done(err); }

      inputXml = xml;

      if (outputPath) {
        readXml(outputPath, (err, xml) => { // eslint-disable-line no-shadow
          if (err) { return void done(err); }

          outputXml = xml;
          done();
        });
      } else {
        done();
      }
    });
  });

  if (attributes.TYPE === 'not-wf' || attributes.TYPE === 'error') {
    // These tests should fail.
    it(`${prefix} should fail to parse ${inputPathRelative}`, () => {
      assert.throws(() => {
        parseXml(inputXml);
      }, Error, description);
    });
  } else {
    // These tests should pass since the documents are well-formed.
    it(`${prefix} should parse ${inputPathRelative}`, () => {
      try {
        // Ignoring undefined entities here allows us to parse numerous test
        // documents that are still valuable tests but would otherwise fail due
        // to reliance on entity declarations support.
        parseXml(inputXml, { ignoreUndefinedEntities: true });
      } catch (err) {
        assert.fail(false, true, `${err.message}\nTest description: ${description}`);
      }
    });

    if (outputPath) {
      it(`${prefix} parsed document should be equivalent to ${outputPathRelative}`, function () {
        let inputDoc;
        let outputDoc;

        try {
          inputDoc = parseXml(inputXml);
          outputDoc = parseXml(outputXml);
        } catch (err) {
          if (/^Named entity isn't defined:/.test(err.message)) {
            // Skip tests that fail due to our lack of support for entity
            // declarations.
            this.skip(); // eslint-disable-line no-invalid-this
            return;
          }

          throw err;
        }

        assert.equal(
          JSON.stringify(inputDoc, null, 2),
          JSON.stringify(outputDoc, null, 2),
          description
        );
      });
    }
  }
}

function createTestCases(testRoot, testCases) {
  describe(testCases.attributes.PROFILE, () => {
    testCases.children.forEach(node => {
      switch (node.name) {
        case 'TESTCASES':
          createTestCases(testRoot, node);
          break;

        case 'TEST':
          createTest(testRoot, node);
          break;
      }
    });
  });
}

function getTextContent(node) {
  switch (node.type) {
    case 'cdata':
    case 'text':
      return node.text;

    case 'element':
      return node.children
        .map(getTextContent)
        .join('');

    default:
      return '';
  }
}

function loadTestSuite(filename, cb) {
  filename = path.join(XMLCONF_ROOT, filename);

  readXml(filename, (err, xml) => {
    if (err) { return void cb(err); }

    let suite;

    try {
      suite = {
        doc: parseXml(xml),
        filename
      };
    } catch (ex) {
      return void cb(ex);
    }

    cb(null, suite);
  });
}

function readXml(filename, cb) {
  if (process.browser) {
    return readXmlBrowser(filename, cb);
  }

  require('fs').readFile(filename, { encoding: 'utf8' }, cb);
}

function readXmlBrowser(filename, cb) {
  /* global XMLHttpRequest */
  let req = new XMLHttpRequest();

  req.addEventListener('error', () => {
    cb(new Error(`Unable to load XML file ${filename}`));
  });

  req.addEventListener('load', () => {
    if (req.status !== 200) {
      return void cb(new Error(`Unable to load XML file ${filename}`));
    }

    cb(null, req.responseText);
  });

  req.open('GET', path.join('..', filename));
  req.overrideMimeType('text/plain;charset=utf-8');
  req.send();
}
