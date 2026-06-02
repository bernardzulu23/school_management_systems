# Uptime monitoring (PROMPT 3-C)

## UptimeRobot (free)

1. Sign up at [uptimerobot.com](https://uptimerobot.com).
2. **Add New Monitor** → HTTP(s).
3. **URL:** `https://www.bluepeacktechnologies.com/api/health`
4. **Monitoring interval:** 5 minutes.
5. **Alert contacts:** add your email.
6. **Advanced:** Keyword monitoring → alert if response body does **not** contain `"status":"ok"` (or `"status": "ok"`).
7. Alert when HTTP status is not **200**.

Repeat for a school subdomain smoke test:

`https://ndakedaysecondaryschool.bluepeacktechnologies.com/api/health`

Use `?live=1` only for process liveness (no DB) — not recommended for production uptime checks.
