import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // This codebase intentionally uses effects to load data and set state.
      // Newer react-hooks eslint rules can flag these patterns as errors even when safe.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      // Some context files export hooks/helpers alongside providers; keep fast refresh.
      'react-refresh/only-export-components': 'off',
    },
  },
])
