# Peoples Management

HR platform with onboarding, employee information, reporting hierarchy, leave,
attendance and rosters, performance reviews, access control, and an HR assistant.

## Project folders

- `frontend/`: React browser interface, optional Electron desktop app, and UI tests.
- `backend/`: Express API, workflow services, database migrations, and integration tests.
- `database/`: MySQL schema and a manifest of tables and relationships.

## Local setup

Use a current Node.js LTS release and MySQL. Install dependencies separately:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set your database URL, a private JWT secret, and SMTP credentials in `backend/.env`.
Import `database/schema.sql` into an empty MySQL database before starting the API.
See `database/README.md` for import details.

```powershell
# Terminal 1, from backend/
npm run dev

# Terminal 2, from frontend/
npm install
npm run dev
```

Open `http://localhost:5174`. The API runs on `http://localhost:3001`, with a
health endpoint at `/health`. `frontend/.env.example` documents the API URL.

For a separate demo database, `npm run db:seed` from `backend/` creates demo
accounts and reference records. Run seed scripts only when you intend to add demo data.

## Build checks

```powershell
# backend/
npm run build

# frontend/
npx tsc --noEmit
npm run build
```

The repository includes source, configuration examples, scripts, and tests.
Local secrets, installed dependencies, generated builds, database backups,
employee uploads, and live audit exports remain on the local machine.
