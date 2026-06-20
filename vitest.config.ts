import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'lib/__tests__/**/*.test.ts',
      'app/**/__tests__/**/*.test.ts',
      'components/**/__tests__/**/*.test.ts',
      'scripts/__tests__/**/*.test.ts',
    ],
    setupFiles: ['lib/__tests__/vitest-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@payload-config': path.resolve(__dirname, './payload.config.ts'),
    },
  },
});
