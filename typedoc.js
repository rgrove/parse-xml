'use strict';

/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: ['./src'],
  highlightLanguages: ['javascript', 'typescript', 'xml'],
  includeVersion: true,
  out: 'docs',
};
