# API Versioning

## Goal

Keep API routing stable and predictable. Every capability has exactly one canonical endpoint. Any alternate URL must be an explicit alias that forwards to the canonical endpoint without duplicating business logic.

## Rule

- **Canonical path:** `/api/<resource>` or `/api/<resource>/<id>` using REST-style naming.
- **Optional alias:** `/api/v1/<resource>` may exist for compatibility, but it must delegate to the canonical handler.

## Canonical First

When adding a new endpoint:

- Create the canonical route under `app/api/.../route.(js|ts)`.
- If you need a versioned path, create an alias under `app/api/v1/.../route.(js|ts)` that calls the canonical implementation.

## Aliases Must Not Re-Implement Logic

Aliases must be thin wrappers:

- No database queries
- No input validation logic beyond calling the canonical handler
- No response shaping

If behavior needs to change, change it in the canonical route only.

## Example (Pattern)

Canonical:

- `app/api/subjects/route.js`

Alias:

- `app/api/v1/subjects/route.js` forwards to the canonical handler.

## Notes

- Versioned aliases are for migration only. Prefer updating clients to canonical paths.
- If multiple clients require different representations, keep the canonical path and negotiate via query params or headers (do not fork endpoints).
