import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  publicDir: 'public', // This ensures public folder (icons, tiles-map) is copied to build output
  build: {
    // Increase chunk size warning limit to avoid warnings for large map tiles
    chunkSizeWarningLimit: 1000,
    // Better handling of Windows file system
    emptyOutDir: true,
  },
  // Optimize for Windows file system
  server: {
    fs: {
      strict: false,
    },
  },
});

