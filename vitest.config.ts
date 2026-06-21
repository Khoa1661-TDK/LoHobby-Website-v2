import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': path.resolve(__dirname, '.'),
  '@payload-config': path.resolve(__dirname, './payload.config.ts'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: [
            'lib/__tests__/**/*.test.ts',
            'app/**/__tests__/**/*.test.ts',
            'components/**/__tests__/**/*.test.ts',
            'scripts/__tests__/**/*.test.ts',
          ],
          setupFiles: ['lib/__tests__/vitest-setup.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'jsdom',
          globals: true,
          environment: 'jsdom',
          include: ['components/**/__tests__/**/*.test.tsx'],
          setupFiles: [
            'lib/__tests__/vitest-setup.ts',
            'lib/__tests__/vitest-setup-react.ts',
          ],
        },
      },
    ],
  },
});
