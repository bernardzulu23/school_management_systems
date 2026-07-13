# OR-Tools timetable solver — Phase 3 P3.3

Optional Python CP-SAT service for large schools. The app falls back to the in-process greedy solver when the service is unavailable.

## Run locally

```bash
cd services/timetable-solver
pip install -r requirements.txt
python server.py 8090
```

Set in `.env.local`:

```
ORTOOLS_SOLVER_URL=http://localhost:8090
```

## API

- **App:** `POST /api/timetable/solver/ortools` (headteacher / admin to persist; HOD read/preview with `{ "persist": false }`)
  - Default **`persist: true`** writes placements to draft `TimetableAllocationEntry` rows (same term/academicYear as body, or Term 1 / current year).
  - Pass **`persist: false`** for compute-only preview.
- **Service:** `POST /solve` with JSON payload (see `solve.py` header)

## Production

Deploy `server.py` on a small VM or container (not Vercel serverless). Point `ORTOOLS_SOLVER_URL` at that host. Keep greedy solver as fallback for reliability.
