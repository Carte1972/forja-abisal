import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// En GitHub Pages el workflow define VITE_BASE=/<nombre-del-repo>/; en local se sirve desde la raíz.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
