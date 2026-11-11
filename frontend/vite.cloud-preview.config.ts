import { mergeConfig, type ProxyOptions } from 'vite';
import config from './vite.config.ts';

// Use the existing authenticated API while previewing local UI changes.
// Only this explicit development command enables the proxy.
const hostedApp = 'https://main.d1hm9lr657368h.amplifyapp.com';
const apiProxy: ProxyOptions = {
  target: hostedApp,
  changeOrigin: true,
  configure(proxy) {
    proxy.on('proxyReq', request => request.setHeader('Origin', hostedApp));
  },
};

export default mergeConfig(config, {
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:5174') },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: { '/api': apiProxy },
  },
});
