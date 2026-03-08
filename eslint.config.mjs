import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
  // 1. Базові налаштування від ESLint
  js.configs.recommended,

  // 2. Вимикаємо правила, що конфліктують з Prettier
  prettier,

  // 3. Основна конфігурація проекту
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest, // Додай, якщо плануєш тести
      },
    },
    plugins: {
      import: importPlugin,
    },
    settings: {
      // Важливо для eslint-plugin-import, щоб він розумів ESM
      'import/resolver': {
        node: true,
      },
    },
    rules: {
      // Рекомендовані правила від плагіна import (вручну для Flat Config)
      ...importPlugin.configs.recommended.rules,

      // Твої кастомні правила
      semi: ['error', 'always'],
      'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
      'no-undef': 'error',

      // Налаштування порядку імпортів
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Вбудовані модулі (fs, path)
            'external', // Пакет з npm
            'internal', // Твій код (аліаси)
            ['parent', 'sibling', 'index'], // Відносні шляхи
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-unresolved': 'error',
      'import/no-named-as-default': 'off', // Вимикаємо, якщо заважає з Mongoose/Express
    },
  },

  // 4. Ігнорування папок (заміна .eslintignore)
  {
    ignores: ['node_modules/', 'dist/', 'coverage/', 'swagger/'],
  },
];
