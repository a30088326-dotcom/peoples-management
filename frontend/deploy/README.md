# Hosted API routing

Apply `amplify-rewrites.json` to this app's Amplify redirect/rewrite rules, preserving
the API rules before the SPA fallback. Set hosted `VITE_API_URL` to the Amplify
frontend origin (`https://main.d1hm9lr657368h.amplifyapp.com`), without `/api` or a
trailing slash. Amplify forwards `/api/*` to the existing HTTPS ECS backend so the
browser uses the same domain for the application and API.

The target address in this deployment file identifies the existing HR backend in
Sydney. If that backend is replaced, update the rewrite targets to its returned
HTTPS endpoint before rebuilding the frontend. Local development can continue
using its local API address.

Before enabling authenticated proxy routes, deploy the backend's `private,
no-store` API response headers. Verify that Authorization reaches the backend,
anonymous requests remain unauthorized even immediately after an authenticated
request, all write methods persist, private downloads match their source, and
responses have no shared-cache age. Public health checks are available at
`/api/health`.
