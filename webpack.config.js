// This webpack config is used to generate a browser bundle for unit testing.
'use strict';

const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    parseXml: './src/index.js',
    testConformance: './tests/conformance.test.js',
    testIndex: './tests/index.test.js'
  },

  module: {
    rules: [{
      test: /\.js$/,
      loader: 'babel-loader'
    }]
  },

  output: {
    filename: '[name].js',
    library: '[name]',
    path: path.resolve(__dirname, 'tmp')
  },

  plugins: [
    new webpack.IgnorePlugin(/^fs$/)
  ]
};
