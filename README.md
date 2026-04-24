# SRM Full Stack Engineering Challenge

This project ships a single Vercel deployment with:

- `POST /bfhl` API
- one-page evaluator-facing frontend
- CORS enabled API route
- local test coverage for edge cases
- strict request validation for API consumers

## Local run

```bash
node server.js
```

Then open `http://localhost:3000`.

## Tests

```bash
node tests/run-tests.js
```

## API contract

### Endpoint

`POST /bfhl`

### Request body

```json
{
  "data": ["A->B", "A->C", "B->D"]
}
```

### Success response example

```json
{
  "user_id": "milindshandilya_06122004",
  "email_id": "ms5435@srmist.edu.in",
  "college_roll_number": "RA2311003010028",
  "hierarchies": [
    {
      "root": "A",
      "tree": {
        "A": {
          "B": {
            "D": {}
          },
          "C": {}
        }
      },
      "depth": 3
    }
  ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 0,
    "largest_tree_root": "A"
  }
}
```

### Error response example

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATA_FIELD",
    "message": "Request body must include a \"data\" array.",
    "details": {
      "example": {
        "data": ["A->B", "A->C", "B->D"]
      }
    }
  }
}
```

## Edge cases covered

- trims whitespace before validation
- rejects self loops like `A->A`
- keeps only the first duplicate in `duplicate_edges`
- silently discards later multi-parent edges
- chooses lexicographically smallest root for pure cycles
- omits `has_cycle` on valid trees
- omits `depth` on cyclic groups
- returns `summary.largest_tree_root` as `null` when there are no valid trees

## Frontend behavior

- accepts plain edge lists or full JSON payloads in the textarea
- live validation shows valid and invalid tokens while typing
- example chips can auto-run the request
- tree hierarchies are rendered as expandable structures
- cycles, invalid entries, and duplicates are color-coded
- raw JSON is available in a collapsible section for verification

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

## Vercel deployment

1. Push this folder to GitHub.
2. Import the repository into Vercel.
3. Keep the framework preset as `Other`.
4. Leave the root directory as the repository root.
5. Add environment variables:
   - `EMAIL_ID`
   - `DOB_DDMMYYYY`
   - optionally `FULL_NAME`
   - optionally `COLLEGE_ROLL_NUMBER`
6. Deploy.

### Wiring

- `api/bfhl.js` handles the evaluator API route.
- `api/profile.js` exposes identity values for the UI.
- `vercel.json` rewrites `/bfhl` to `/api/bfhl`.
- static frontend files live in `public/`.
