#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

import { build, context } from 'esbuild';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

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
  sourcesContent: false,
  target: 'es2017',
  treeShaking: true,
};

// ESM browser bundle.
let esmOptions = {
  ...options,
  format: 'esm',
  outfile: './dist/browser.js',
  sourcemap: false,
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
  let esmContext = await context(esmOptions);
  let globalContext = await context(globalOptions);

  await Promise.all([
    esmContext.watch(),
    globalContext.watch(),
  ]);
} else {
  await Promise.all([
    build(esmOptions),
    build(globalOptions),
  ]);
}
