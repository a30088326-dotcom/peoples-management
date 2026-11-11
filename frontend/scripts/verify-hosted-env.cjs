const raw = process.env.VITE_API_URL;
let api;
try { api = new URL(raw); } catch { throw new Error('Set VITE_API_URL to the deployed HTTPS API origin before Amplify builds.'); }
if(api.protocol !== 'https:' || api.origin !== raw || /localhost|127\.0\.0\.1/.test(api.hostname)) {
  throw new Error('VITE_API_URL must be the exact HTTPS API origin, without /api or a trailing slash.');
}
console.log('Hosted API origin configured.');
