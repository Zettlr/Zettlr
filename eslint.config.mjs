import tsESLintParser from '@typescript-eslint/parser'
import tsESLintPlugin from '@typescript-eslint/eslint-plugin'
import stylisticTSLint from '@stylistic/eslint-plugin'
import vueParser from 'vue-eslint-parser'
import pluginVue from 'eslint-plugin-vue'

export default [
  {
    // With the new flat configs, we unfortunately have to ignore everything
    // manually that we don't want linted.
    ignores: [
      '**/*.mjs',
      '*.js',
      'scripts/**/*.js',
      'resources/**/*.js',
      '.webpack/**/*.js'
    ]
  },
  // This extends the following configs:
  {
    plugins: {
      '@typescript-eslint': tsESLintPlugin
    },
    rules: {
      ...tsESLintPlugin.configs.recommended.rules
    }
  },
  // flat/recommended === vue3-recommended
  ...pluginVue.configs['flat/recommended'],
  // Our manual extensions:
  {
    files: ['source/**/*.{ts,vue,js}'],
    plugins: {
      // The keys here must correspond to the plugin namespaces referred below
      '@typescript-eslint': tsESLintPlugin,
      '@stylistic': stylisticTSLint,
      vue: pluginVue
    },
    languageOptions: {
      parserOptions: {
        parser: tsESLintParser,
        project: './tsconfig.json',
        extraFileExtensions: ['.vue'],
        ecmaVersion: 2018
      },
      parser: vueParser
    },
    rules: {
      ////////////////////////// STYLISTIC RULES ///////////////////////////////

      // Disallow semicolons except where absolutely necessary
      '@stylistic/semi': [ 'error', 'never' ],
      // Require multi-line arrays to have brackets on their own line
      '@stylistic/array-bracket-newline': [ 'error', 'consistent' ],
      '@stylistic/array-bracket-spacing': [
        'error',
        'always',
        { objectsInArrays: false, singleValue: false }
      ],
      '@stylistic/arrow-spacing': [ 'error' ],
      '@stylistic/brace-style': [ 'error', '1tbs', { allowSingleLine: true }],
      '@stylistic/dot-location': [ 'error', 'property' ],
      '@stylistic/eol-last': [ 'error', 'always' ],
      '@stylistic/indent': [ 'error', 2 ],

      /////////////////////// END STYLISTIC RULES //////////////////////////////

      // We do use explicit anys at certain points
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off', // We need to turn off the vanilla option ...
      // ... and turn on the TypeScript one. HOWEVER, we also need to use the
      // appropriate option that allows us to declare variables as unused by
      // prefixing it with an underscore.
      '@typescript-eslint/no-unused-vars': 'off',
      // See https://typescript-eslint.io/rules/no-unused-vars/

      'space-before-function-paren': [ 'error', 'always' ],
      // The following rule-changes to JSStandard Coding Style are tradition,
      // as they were included with the default configuration of Atom's ESLint
      // plugin, so we'll keep them here for the time being.
      'prefer-const': 'off',
      // Sometimes, it makes sense to return a void to save a line of code, so we
      // keep this rule off.
      '@typescript-eslint/no-confusing-void-expression': 'off',
      // Here follow vue-styles. While the short form is recommended
      // I tend to value verbose code. At least for now, discussion is
      // well received.
      'vue/v-bind-style': [ 'error', 'longform' ],
      'vue/v-on-style': [ 'error', 'longform' ],
      // Let the implementation decide if self-closing is wanted or not.
      'vue/html-self-closing': [
        'warn',
        {
          html: {
            void: 'any',
            normal: 'any',
            component: 'any'
          },
          svg: 'any',
          math: 'any'
        }
      ],
      // Allow up to three attributes per line so that the contributor can
      // decide if the attributes are too long for the 80 character column
      'vue/max-attributes-per-line': [
        'error',
        {
          singleline: 3,
          multiline: 3
        }
      ],
      // We allow the use of v-html directives, because we sanitize any user
      // provided HTML to only contain safe tags. The only stuff we currently
      // put in there is translation strings, which we sanitise in the trans()
      // function. NOTE to keep this on my mind!
      'vue/no-v-html': 'off',

      // If we activate this rule, we have about 500 errors that there are no
      // spaces around | operators. Hasn't been a problem until now, won't be
      // one in the future.
      '@typescript-eslint/space-infix-ops': 'off',
      '@typescript-eslint/no-base-to-string': [
        'error',
        {
          ignoredTypeNames: ['Text']
        }
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      // DEBUG: Turn a few errors into warnings after upgrading ESLint to >6.x
      // This rule is difficult to disable right now; it interferes with the
      // "no-null-assertion" rule, and it won't be an easy fix. We'll have to
      // think about it.
      '@typescript-eslint/non-nullable-type-assertion-style': 1,
      // The following two rules conflict with each other in a few edge cases, so
      // we'll keep both on "warning" severity for now.
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 1,
      '@typescript-eslint/strict-boolean-expressions': 1,
      // The following rule basically disallows use of `any`
      '@typescript-eslint/no-unsafe-argument': 1
    }
  }
]
