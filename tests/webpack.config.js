// This webpack config is used to generate browser bundles for unit testing.
'use strict';

const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    testConformance: path.resolve(__dirname, 'conformance.test.js'),
    testIndex: path.resolve(__dirname, 'index.test.js')
  },

  mode: 'development',

  module: {
    rules: [{
      test: /\.js$/,
      use: [{
        loader: 'babel-loader'
      }]
    }]
  },

  output: {
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd'
  },

  plugins: [
    new webpack.IgnorePlugin(/^fs$/)
  ]
};
