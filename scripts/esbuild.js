#!/usr/bin/env node
'use strict';

const { build, context } = require('esbuild');

const pkg = require('../package.json');

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  banner: {
    js: `/*! ${pkg.name} v${pkg.version} | ISC License | Copyright Ryan Grove */`,
  },
  bundle: true,
  entryPoints: ['./src/index.ts'],
  logLevel: 'info',
  mangleProps: /^consume([A-Z]|$)|^(addNode|addText|advance|charCount|charIndex|charIndex|charIndexToByteIndex|charLength|charsToBytes|currentNode|error|isEnd|multiByteMode|options|peek|reset|scanner|string|syntax|validateChars)$/,
  sourcemap: true,
  target: 'es2017',
  treeShaking: true,
};

async function main() {
  // CommonJS browser bundle.
  let cjsOptions = {
    ...options,
    format: 'cjs',
    outfile: './dist/browser.js',
  };

  // Minified global bundle.
  let globalOptions = {
    ...options,
    footer: {
      js: 'parseXml=parseXml.parseXml',
    },
    globalName: 'parseXml',
    minify: true,
    outfile: './dist/global.min.js',
  };

  if (watch) {
    let cjsContext = await context(cjsOptions);
    let globalContext = await context(globalOptions);

    await Promise.all([
      cjsContext.watch(),
      globalContext.watch(),
    ]);
  } else {
    await Promise.all([
      build(cjsOptions),
      build(globalOptions),
    ]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
