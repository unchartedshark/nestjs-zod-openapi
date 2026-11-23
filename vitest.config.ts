import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    swc.vite({ module: { type: 'es6' } }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.spec.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    pool: 'forks',
    maxWorkers: 1,
  },
});
