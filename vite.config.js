import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, open: '/feeflow.html' },
  build: { rollupOptions: { input: 'feeflow.html' } }
});
