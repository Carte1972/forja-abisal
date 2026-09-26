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
    // rapier3d-compat incluye su WASM en base64 (~4,3 MB, ~1,7 MB con gzip): va en su propio chunk.
    chunkSizeWarningLimit: 4500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'rapier', test: /node_modules[\\/]@dimforge/ },
            // Solo el núcleo: los addons (p. ej. GLTFLoader) se cargan bajo demanda en su propio chunk.
            { name: 'three', test: /node_modules[\\/]three[\\/]build/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'video/scripts/**/*.test.ts'],
    environment: 'node',
  },
});
