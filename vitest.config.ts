import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  test: {
    // Only run tests inside src/ — skips node_modules, _archive/, dist/.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
