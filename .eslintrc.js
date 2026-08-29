'use strict';

module.exports = {
  extends: [
    '@rgrove/eslint-config',
    '@rgrove/eslint-config/browser',
    '@rgrove/eslint-config/commonjs',
    '@rgrove/eslint-config/node',
    '@rgrove/eslint-config/typescript',
  ],

  settings: {
    // The default node resolver doesn't understand `exports` maps, which
    // ESM-only dependencies rely on.
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },

  rules: {
    'no-implicit-coercion': ['warn', {
      allow: ['!!'],
    }],
    '@typescript-eslint/type-annotation-spacing': 'off',
  },
};
