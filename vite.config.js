import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Two pages: the game (index.html) and the editors' puzzle builder (builder.html).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        builder: resolve(import.meta.dirname, 'builder.html'),
      },
    },
  },
});
