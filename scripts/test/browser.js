#!/usr/bin/env node
'use strict';

const path = require('node:path');
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

const concurrently = require('concurrently');
const { context } = require('esbuild');

const testDir = path.resolve(__dirname, '..', '..', 'tests');

async function main() {
  let buildContext = await context({
    alias: {
      path: 'path-browserify',
    },
    bundle: true,
    define: {
      __dirname: '"/"',
      'process.env.NODE_DEBUG': 'undefined',
      'process.env.NODE_ENV': '"test"',
    },
    entryPoints: [
      path.resolve(testDir, 'browser.js'),
    ],
    external: ['fs'],
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
