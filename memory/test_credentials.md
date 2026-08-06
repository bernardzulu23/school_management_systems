# Test credentials (local / staging only)

Do **not** store production passwords in this file.

## Local seed accounts

After `npm run seed:local`, use emails from that script and the password in
`LOCAL_DEV_PASSWORD` (see `.env.example`). Never commit a real password here.

## Staging demos

Reset passwords via the school admin UI or forgot-password flow. Document only
emails and school **names** (not passwords or live school UUIDs) in private runbooks.
