'use strict';

const path = require('path');

module.exports = {
  devtool: 'source-map',
  entry: './src/index.js',
  mode: 'production',

  module: {
    rules: [{
      test: /\.js$/
    }]
  },

  output: {
    filename: 'parse-xml.min.js',
    globalObject: "typeof self !== 'undefined' ? self : this", // see https://github.com/webpack/webpack/issues/6522
    library: {
      commonjs: 'parse-xml',
      root: 'parseXml'
    },
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist', 'umd')
  }
};
