# Development branch

Use `dev` for ongoing frontend changes. The backend has its own `dev` branch in
the separate `a30088326-dotcom/backend` repository.

From this frontend checkout:

```powershell
git switch dev
git pull --ff-only
```

After editing, verify and upload the code:

```powershell
npm run typecheck
npm test
npm run build
git status
git add .
git diff --cached --stat
git commit -m "Describe the frontend change"
git push
```

Review the staged files before committing. `.env` files, dependency folders and
build output are ignored. Real employee data and uploads do not belong in Git.
Commit and push backend edits from its checkout separately.

When ready for release, open a pull request from `dev` into `main`. Pushing `dev`
does not merge it into `main`. Deployment depends on the branch configured in
the hosting service; it is not changed by this branch setup.
