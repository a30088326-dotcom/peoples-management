# Peoples Management

HR application source for the React frontend and the TypeScript API.

- `frontend/` contains the HR interface, frontend tests, and the Amplify build configuration.
- `backend/` contains the API, database definitions, and AWS infrastructure.
- `backend/database/` contains schema and table definitions.

The live site is [Peoples Management](https://main.d1hm9lr657368h.amplifyapp.com). Amplify builds its production frontend from the `main` branch of [the frontend repository](https://github.com/a30088326-dotcom/frontend).

For a local preview of the frontend, install its dependencies and run `npm run dev:cloud` in `frontend/`. Open [localhost:5174](http://localhost:5174). This preview uses the existing authenticated AWS API.
