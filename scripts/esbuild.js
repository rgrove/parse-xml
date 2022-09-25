#!/usr/bin/env node
'use strict';

const { build } = require('esbuild');

const pkg = require('../package.json');

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  banner: {
    js: `/*! ${pkg.name} v${pkg.version} | ISC License | Copyright Ryan Grove */`,
  },
  bundle: true,
  entryPoints: ['./src/index.ts'],
  mangleProps: /^consume([A-Z]|$)|^(addNode|addText|advance|charCount|charIndex|charIndex|charIndexToByteIndex|charLength|charsToBytes|currentNode|error|isEnd|multiByteMode|peek|reset|scanner|syntax|validateChars)$/,
  sourcemap: true,
  target: 'es2017',
  treeShaking: true,
};

async function main() {
  await Promise.all([
    // CommonJS browser bundle.
    build({
      ...options,
      format: 'cjs',
      outfile: './dist/browser.js',
      watch,
    }),

    // Minified global bundle.
    build({
      ...options,
      footer: {
        js: 'parseXml=parseXml.parseXml',
      },
      globalName: 'parseXml',
      minify: true,
      outfile: './dist/global.min.js',
    }),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
