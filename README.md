# SRM Full Stack Engineering Challenge

This project includes:

- `POST /bfhl` API
- solid single-page frontend
- CORS enabled for the API
- Vercel-ready serverless routes
- local test coverage for the hierarchy rules

## Local run

```bash
node server.js
```

Then open `http://localhost:3000`.

## Tests

```bash
node tests/run-tests.js
```

## Important profile fields

Update these before submission if needed:

- `EMAIL_ID`
- `DOB_DDMMYYYY`

You can either edit `processor.js` or run with environment variables.

PowerShell:

```powershell
$env:EMAIL_ID='yourname@srmist.edu.in'
$env:DOB_DDMMYYYY='ddmmyyyy'
node server.js
```

`COLLEGE_ROLL_NUMBER` defaults to `RA2311003010028`.

## Vercel deployment plan

1. Push this folder to your GitHub repo.
2. Import that GitHub repo into Vercel.
3. Keep the framework preset as `Other`.
4. Leave the root directory as the repository root.
5. Add environment variables in Vercel:
   - `EMAIL_ID`
   - `DOB_DDMMYYYY`
   - optionally `FULL_NAME`
   - optionally `COLLEGE_ROLL_NUMBER`
6. Deploy.

### How it is wired

- `api/bfhl.js` handles the evaluator API.
- `api/profile.js` exposes the identity status for the frontend.
- `vercel.json` rewrites `/bfhl` to `/api/bfhl` so the evaluator can call the exact required path.
- Static frontend files are served from `public/`.
