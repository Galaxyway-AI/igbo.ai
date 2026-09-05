import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.astro/**',
      '.wrangler/**',
      'test-results/**',
      'worker-configuration.d.ts',
    ],
  },
  ...tseslint.configs.recommended,
);
