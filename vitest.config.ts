import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The website's one test runner (backend feature 006, T052 / T063). Components run
// under jsdom; JSX is compiled by the bundled transformer with React's automatic
// runtime, so no extra plugin is needed.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
