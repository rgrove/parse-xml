#!/usr/bin/env node
'use strict';

const { build } = require('esbuild');

const pkg = require('../package.json');

build({
  banner: {
    js: `/*! ${pkg.name} v${pkg.version} | ISC License | Copyright Ryan Grove */`,
  },
  bundle: true,
  entryPoints: ['./src/index.ts'],
  footer: {
    js: 'parseXml=parseXml.parseXml',
  },
  globalName: 'parseXml',
  minify: true,
  outfile: './dist/bundle.min.js',
  sourcemap: true,
  target: 'es2017',
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
