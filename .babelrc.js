// Default Babel config. Produces browser-compatible CommonJS modules.
'use strict';

module.exports = {
  ignore: [
    'dist',
    'node_modules'
  ],

  presets: [
    ['@babel/preset-env', {
      forceAllTransforms: true,
      loose: true
    }]
  ],

  sourceType: 'unambiguous'
};
