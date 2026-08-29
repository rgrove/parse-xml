#!/usr/bin/env node

import { exec as execCallback } from 'node:child_process';
import path from 'node:path';
import util from 'node:util';

import { concurrently } from 'concurrently';
import { context } from 'esbuild';

const exec = util.promisify(execCallback);

const testDir = path.resolve(import.meta.dirname, '..', '..', 'tests');

let buildContext = await context({
  alias: {
    // esbuild doesn't implement Node's self-reference resolution, and the
    // browser tests should exercise the browser bundle, which is what the
    // `browser` field points Node's own resolution at.
    '@rgrove/parse-xml': path.resolve(testDir, '..', 'dist', 'browser.js'),
    'node:assert': 'assert',
    'node:path': 'path-browserify',
  },
  bundle: true,
  define: {
    'import.meta.dirname': '"/"',
    'process.env.NODE_DEBUG': 'undefined',
    'process.env.NODE_ENV': '"test"',
  },
  entryPoints: [
    path.resolve(testDir, 'browser.js'),
  ],
  external: ['node:fs/promises'],
  format: 'esm',
  logLevel: 'info',
  outdir: path.resolve(testDir, '.build'),
  sourcemap: true,
});

await Promise.allSettled([
  buildContext.serve({
    servedir: testDir,
  }),

  concurrently([
    {
      name: 'build:bundle',
      command: 'pnpm --silent run build:bundle --watch',
    },
    {
      name: 'build:js    ',
      command: 'pnpm --silent run build:js --watch --preserveWatchOutput',
    },
  ], {
    killOthers: ['failure'],
    prefix: '{name}',
    prefixColors: ['auto'],
  }),

  exec('sleep 0.5 && open "http://127.0.0.1:8000/"'),
]);
