import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0' },
  build: {
    rollupOptions: {
      output: {
        // Phaser ships a single non-tree-shakeable ESM bundle (~1.2 MB minified),
        // so it dominates the output. Give it its own chunk so app-code changes
        // do not invalidate the cached engine bundle; both chunks are still
        // loaded at startup because the game needs Phaser immediately.
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
