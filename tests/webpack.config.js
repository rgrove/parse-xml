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
      test: /\.js$/
    }]
  },

  output: {
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd'
  },

  plugins: [
    new webpack.IgnorePlugin(/^fs$/),

    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],

  resolve: {
    fallback: {
      assert: require.resolve('assert'),
      fs: false,
      path: require.resolve('path-browserify'),
    }
  }
};
