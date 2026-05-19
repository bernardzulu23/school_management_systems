# ZSMS Teacher (React Native)

Companion app for **attendance** and **ECZ SBA scores**, synced to the same database as the ZSMS web app.

## Setup

```bash
cd zsms-mobile
cp .env.example .env
# Edit EXPO_PUBLIC_API_BASE_URL
npm install
npx expo start
```

## Docs

Full API and function inventory: [`../docs/doc/mobile-app.md`](../docs/doc/mobile-app.md)

## Theme

Colors match the web app (`#EFECE5`, `#111111`, `#FF3B00`) — see `src/theme/colors.ts`.

## Pilot school

- Subdomain: `stmaryschristian`
- Use a teacher account from that school after seeding.
