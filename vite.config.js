import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // In development the Vite app is opened at its own root URL. Production
  // assets are mounted by Express under /admin.
  base: command === 'build' ? '/admin/' : '/',
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } }
  }
}));
