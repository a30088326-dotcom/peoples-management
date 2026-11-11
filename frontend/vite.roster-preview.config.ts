import { defineConfig, mergeConfig } from 'vite';
import config from './vite.config';

export default defineConfig(mergeConfig(config, {
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('/'),
    'import.meta.env.VITE_ROSTER_PREVIEW': JSON.stringify('true'),
  },
  server: {
    host: 'localhost',
    port: 5176,
    proxy: {
      '/api': 'http://127.0.0.1:3199',
    },
  },
}));
