import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Log recursive directory contents (excluding node_modules)
try {
  function logDir(dir: string, prefix = '') {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'dist') continue;
      const fullPath = path.join(dir, file);
      const isDir = fs.statSync(fullPath).isDirectory();
      console.log(`[FILE-DISCOVERY] ${prefix}${file}${isDir ? '/' : ''}`);
      if (isDir) {
        logDir(fullPath, prefix + file + '/');
      }
    }
  }
  logDir('.');
} catch (e) {
  console.log('Error listing', e);
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
