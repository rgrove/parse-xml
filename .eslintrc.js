'use strict';

module.exports = {
  extends: [
    '@rgrove/eslint-config',
    '@rgrove/eslint-config/browser',
    '@rgrove/eslint-config/commonjs',
    '@rgrove/eslint-config/node',
    '@rgrove/eslint-config/typescript',
  ],

  rules: {
    'no-implicit-coercion': ['warn', {
      allow: ['!!'],
    }],
    '@typescript-eslint/type-annotation-spacing': 'off',
  },
};
