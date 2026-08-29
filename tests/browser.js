import 'mocha/mocha.css';
import mocha from 'mocha/mocha.js';

// `mocha.setup()` must run before any test file is evaluated, so the test files
// are imported dynamically rather than with hoisted static imports.
mocha.setup({
  ui: 'bdd',
});

await import('./index.test.js');
await import('./lib/Parser.test.js');
await import('./lib/StringScanner.test.js');
await import('./lib/XmlCdata.test.js');
await import('./lib/XmlComment.test.js');
await import('./lib/XmlDeclaration.test.js');
await import('./lib/XmlDocument.test.js');
await import('./lib/XmlDocumentType.test.js');
await import('./lib/XmlElement.test.js');
await import('./lib/XmlNode.test.js');
await import('./lib/XmlProcessingInstruction.test.js');
await import('./lib/XmlText.test.js');
await import('./conformance.test.js');

mocha.checkLeaks();
mocha.run();
