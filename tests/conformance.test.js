/* eslint-env mocha */
/* eslint-disable func-names */
'use strict';

const assert = require('assert');
const path = require('path');

const { parseXml } = require('..');

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

  'japanese/japanese.xml',
  'oasis/oasis.xml',
  'sun/sun-error.xml',

  // Skipping because the test case XML files themselves are not well-formed
  // XML and thus can't be parsed. ಠ_ಠ
  // 'sun/sun-invalid.xml',
  // 'sun/sun-not-wf.xml',
  // 'sun/sun-valid.xml',

  'xmltest/xmltest.xml',
];

// Names of spec sections whose tests should be skipped because we don't
// implement those parts of the spec.
const skipSections = [
  '2.3 [11]', // DTD internal subset
  '2.8 [30]', // extSubset
  '3.3', // Attribute-List Declarations
  '4.1 [69]', // PEReference
  '4.2', // Entity Declarations
];

// Ids of tests that should be skipped because they require functionality that
// our parser intentionally doesn't implement (mostly DTD-related).
const skipTests = new Set([
  'hst-lhs-007', // validation of unsupported iso-8859-1 encoding
  'hst-lhs-008', // unsupported encoding validation
  'ibm-invalid-P32-ibm32i01.xml', // external DTD
  'ibm-invalid-P32-ibm32i03.xml', // external DTD
  'ibm-invalid-P32-ibm32i04.xml', // external DTD
  'ibm-invalid-P68-ibm68i01.xml', // DTD validation + external DTD
  'ibm-invalid-P68-ibm68i02.xml', // DTD validation + external DTD
  'ibm-invalid-P68-ibm68i03.xml', // DTD validation + external DTD
  'ibm-invalid-P68-ibm68i04.xml', // DTD validation + external DTD
  'ibm-invalid-P69-ibm69i01.xml', // DTD validation + external DTD
  'ibm-invalid-P69-ibm69i02.xml', // DTD validation + external DTD
  'ibm-invalid-P69-ibm69i03.xml', // DTD validation + external DTD
  'ibm-invalid-P69-ibm69i04.xml', // DTD validation + external DTD
  'ibm-valid-P32-ibm32v01.xml', // external DTD
  'ibm-valid-P32-ibm32v03.xml', // external DTD
  'ibm-valid-P32-ibm32v04.xml', // external DTD
  'invalid-not-sa-022', // conditional section
  'not-wf-not-sa-001', // external DTD
  'not-wf-not-sa-002', // DTD validation
  'not-wf-not-sa-003', // external DTD
  'not-wf-not-sa-004', // external DTD
  'not-wf-not-sa-005', // external DTD
  'not-wf-not-sa-006', // external DTD
  'not-wf-not-sa-007', // external DTD
  'not-wf-not-sa-009', // external DTD
  'not-wf-sa-057', // DTD validation
  'not-wf-sa-078', // entity declaration
  'not-wf-sa-079', // entity declaration
  'not-wf-sa-080', // entity declaration
  'not-wf-sa-082', // DTD validation
  'not-wf-sa-084', // entity declaration
  'not-wf-sa-086', // DTD validation
  'not-wf-sa-087', // DTD validation
  'not-wf-sa-113', // DTD validation
  'not-wf-sa-114', // DTD validation
  'not-wf-sa-121', // entity declaration
  'not-wf-sa-122', // DTD validation
  'not-wf-sa-123', // DTD validation
  'not-wf-sa-124', // DTD validation
  'not-wf-sa-125', // DTD validation
  'not-wf-sa-126', // DTD validation
  'not-wf-sa-127', // DTD validation
  'not-wf-sa-128', // DTD
  'not-wf-sa-129', // DTD validation
  'not-wf-sa-130', // DTD validation
  'not-wf-sa-131', // DTD validation
  'not-wf-sa-132', // DTD validation
  'not-wf-sa-133', // DTD validation
  'not-wf-sa-134', // DTD validation
  'not-wf-sa-135', // DTD validation
  'not-wf-sa-136', // DTD validation
  'not-wf-sa-137', // DTD validation
  'not-wf-sa-138', // DTD validation
  'not-wf-sa-139', // DTD validation
  'not-wf-sa-149', // DTD validation
  'not-wf-sa-160', // entity declaration
  'not-wf-sa-161', // entity declaration
  'not-wf-sa-162', // entity declaration
  'not-wf-sa-179', // entity declaration
  'not-wf-sa-180', // entity declaration
  'not-wf-sa-183', // DTD validation
  'not-wf-sa-184', // DTD validation
  'o-p09fail1', // external DTD
  'o-p09fail2', // external DTD
  'o-p09fail3', // entity declaration
  'o-p09fail4', // entity declaration
  'o-p09fail5', // entity declaration
  'o-p12fail1', // DTD validation
  'o-p12fail2', // DTD validation
  'o-p12fail3', // DTD validation
  'o-p12fail4', // DTD validation
  'o-p12fail5', // DTD validation
  'o-p12fail6', // DTD validation
  'o-p12fail7', // DTD validation
  'o-p29fail1', // DTD validation
  'o-p31fail1', // external DTD
  'o-p45fail1', // DTD validation
  'o-p45fail2', // DTD validation
  'o-p45fail3', // DTD validation
  'o-p45fail4', // DTD validation
  'o-p46fail1', // DTD validation
  'o-p46fail2', // DTD validation
  'o-p46fail3', // DTD validation
  'o-p46fail4', // DTD validation
  'o-p46fail5', // DTD validation
  'o-p46fail6', // DTD validation
  'o-p47fail1', // DTD validation
  'o-p47fail2', // DTD validation
  'o-p47fail3', // DTD validation
  'o-p47fail4', // DTD validation
  'o-p48fail1', // DTD validation
  'o-p48fail2', // DTD validation
  'o-p51fail1', // DTD validation
  'o-p51fail2', // DTD validation
  'o-p51fail3', // DTD validation
  'o-p51fail4', // DTD validation
  'o-p51fail5', // DTD validation
  'o-p51fail6', // DTD validation
  'o-p51fail7', // DTD validation
  'o-p61fail1', // external DTD
  'o-p62fail1', // external DTD
  'o-p62fail2', // external DTD
  'o-p63fail1', // external DTD
  'o-p63fail2', // external DTD
  'o-p64fail1', // external DTD
  'o-p64fail2', // external DTD
  'pr-xml-utf-16', // unsupported UTF-16 BE encoding
  'rmt-e2e-34', // DTD
  'rmt-e2e-55', // DTD
  'rmt-e2e-61', // we don't support charsets other than UTF-8
  'rmt-e3e-12', // attribute-list declaration
  'valid-not-sa-012', // external DTD
  'valid-not-sa-013', // conditional section
  'valid-not-sa-014', // conditional section
  'valid-not-sa-015', // conditional section
  'valid-not-sa-016', // conditional section
  'valid-not-sa-019', // entity declaration
  'valid-not-sa-020', // entity declaration
  'valid-not-sa-023', // entity declaration
  'valid-not-sa-028', // conditional section
  'valid-not-sa-029', // conditional section
  'valid-sa-044', // DTD
  'valid-sa-049', // test file is encoded as UTF-16 LE, which we don't support
  'valid-sa-050', // test file is encoded as UTF-16 LE, which we don't support
  'valid-sa-051', // test file is encoded as UTF-16 LE, which we don't support
  'valid-sa-094', // DTD
  'valid-sa-114', // entity declaration
  'weekly-utf-16', // unsupported UTF-16 BE encoding
  'x-rmt-008', // asserts a failure in XML 1.0 <=4th edition, but we implement 5th edition, which allows this
]);

// Mapping of test ids to non-UTF-8 encodings that should be used to read those
// test files. These are typically tests that contain character sequences that
// aren't valid in UTF-8 and are intended to cause the parser to fail.
const specialEncodings = {
  'not-wf-sa-168': 'utf-16le',
  'not-wf-sa-169': 'utf-16le',
  'not-wf-sa-170': 'utf-16le',
  'not-wf-sa-175': 'utf-16le',
  'pr-xml-little': 'utf-16le',
  'rmt-e2e-27': 'utf-16le',
  'weekly-little': 'utf-16le',
  'x-ibm-1-0.5-not-wf-P04-ibm04n21.xml': 'utf-16le',
  'x-ibm-1-0.5-not-wf-P04-ibm04n22.xml': 'utf-16le',
  'x-ibm-1-0.5-not-wf-P04-ibm04n23.xml': 'utf-16le',
  'x-ibm-1-0.5-not-wf-P04-ibm04n24.xml': 'utf-16le',
  'x-ibm-1-0.5-not-wf-P04a-ibm04an21.xml': 'utf-16le',
  'x-ibm-1-0.5-not-wf-P04a-ibm04an22.xml': 'utf-16le',
  'x-ibm-1-0.5-not-wf-P04a-ibm04an23.xml': 'utf-16le',
  'x-ibm-1-0.5-not-wf-P04a-ibm04an24.xml': 'utf-16le',
};

// -- Tests --------------------------------------------------------------------
(async () => {
  let testSuites = await Promise.all(testSuiteFiles.map(loadTestSuite));

  describe("XML conformance tests", () => {
    for (let suite of testSuites) {
      let { doc, filename } = suite;
      let testRoot = path.dirname(filename);

      for (let node of doc.children) {
        if (node.name === 'TESTCASES') {
          createTestCases(testRoot, node);
        }
      }
    }
  });

  run(); // This is a Mocha global.
})();

// -- Helpers ------------------------------------------------------------------
function createTest(testRoot, test) {
  let { attributes } = test;
  let rec = attributes.RECOMMENDATION || 'XML1.0';
  let version = attributes.VERSION || '1.0';

  if (!rec.startsWith('XML1.0') || !version.includes('1.0')) {
    // Ignore tests that aren't for XML 1.0.
    return;
  }

  let description = test.text.trim();
  let inputPath = path.join(testRoot, attributes.URI);
  let inputPathRelative = path.relative(REPO_ROOT, inputPath);
  let inputXml;
  let outputPath;
  let outputPathRelative;
  let outputXml;
  let prefix = `[${attributes.ID}] ${attributes.SECTIONS}:`;
  let sections = attributes.SECTIONS.split(/\s*,\s*/);

  if (attributes.OUTPUT) {
    outputPath = path.join(testRoot, attributes.OUTPUT);
    outputPathRelative = path.relative(REPO_ROOT, outputPath);
  }

  function shouldSkip() {
    return skipTests.has(attributes.ID)
      || sections.some(section => skipSections.some(skip => section.startsWith(skip)));
  }

  before(async () => {
    inputXml = await readXml(inputPath, attributes.ID);

    if (outputPath) {
      outputXml = await readXml(outputPath, attributes.ID);
    }
  });

  if (attributes.TYPE === 'not-wf' || attributes.TYPE === 'error') {
    // This test should fail.
    it(`${prefix} fails to parse ${inputPathRelative}`, function () {
      if (shouldSkip()) {
        // Skip tests for unsupported functionality.
        this.skip();
      }

      assert.throws(() => {
        parseXml(inputXml);
      }, Error, description);
    });

    return;
  }

  // This test should pass since the documents are well-formed.
  it(`${prefix} parses ${inputPathRelative}`, function () {
    if (shouldSkip()) {
      // Skip tests for unsupported functionality.
      this.skip();
    }

    try {
      // Ignoring undefined entities here allows us to parse numerous test
      // documents that are still valuable tests but would otherwise fail due
      // to reliance on entity declarations support.
      parseXml(inputXml, { ignoreUndefinedEntities: true });
    } catch (err) {
      assert.fail(`${err.message}\nTest description: ${description}`);
    }
  });

  if (outputPath) {
    it(`${prefix} parsed document is equivalent to ${outputPathRelative}`, function () {
      if (shouldSkip()) {
        // Skip tests for unsupported functionality.
        this.skip();
      }

      let inputDoc;
      let outputDoc;

      try {
        inputDoc = parseXml(inputXml);
        outputDoc = parseXml(outputXml);
      } catch (err) {
        if (/^Named entity isn't defined:/.test(err.message)) {
          // Skip tests that fail due to our lack of support for entity
          // declarations.
          this.skip();
        }

        throw err;
      }

      assert.equal(
        JSON.stringify(inputDoc, null, 2),
        JSON.stringify(outputDoc, null, 2),
        description,
      );
    });
  }
}

function createTestCases(testRoot, testCases) {
  describe(testCases.attributes.PROFILE, () => {
    for (let node of testCases.children) {
      switch (node.name) {
        case 'TESTCASES':
          createTestCases(testRoot, node);
          break;

        case 'TEST':
          createTest(testRoot, node);
          break;
      }
    }
  });
}

async function loadTestSuite(filename) {
  filename = path.join(XMLCONF_ROOT, filename);

  return {
    doc: parseXml(await readXml(filename, '')),
    filename,
  };
}

async function readXml(filename, testId) {
  let encoding = specialEncodings[testId] || 'utf-8';

  if (typeof window !== 'undefined') {
    return readXmlBrowser(filename, encoding);
  }

  return new Promise((resolve, reject) => {
    require('fs').readFile(filename, { encoding }, (err, xml) => {
      if (err) { return void reject(err); }
      resolve(xml);
    });
  });
}

function readXmlBrowser(filename, encoding) {
  return new Promise((resolve, reject) => {
    let req = new XMLHttpRequest();

    req.addEventListener('error', () => {
      reject(new Error(`Unable to load XML file ${filename}`));
    });

    req.addEventListener('load', () => {
      if (req.status !== 200) {
        return void reject(new Error(`Unable to load XML file ${filename}`));
      }

      resolve(req.responseText);
    });

    req.open('GET', path.join('..', filename));
    req.overrideMimeType(`text/plain;charset=${encoding}`);
    req.send();
  });
}
