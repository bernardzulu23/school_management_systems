# ZSMS mobile app scope (internal)

This document is for support staff and school onboarding — not shown inside the app.

## What the mobile app does

The **ZSMS Teacher App** (`zsms-mobile/`, package `com.bluepeack.zsms.teacher`) is built for teachers on the go:

- Mark class attendance (sessions, QR-style flows where configured)
- Record SBA / assessment scores
- View attendance history
- Cache lesson plans for offline reading
- Push notification token registration (when enabled on server)
- Student-facing shortcuts on shared devices: timetable, results, ECZ practice, notices

## What the mobile app does not do (by design)

These need a full keyboard, large screen, or complex workflows — **web only**:

- Master timetable building and publishing
- Lesson plan authoring and HOD approval queues
- School billing and subscription management
- Headteacher MOE reports and school-wide admin
- Full assessment authoring and ECZ submission workflows
- Bulk SMS broadcasts

Teachers should use the **school web portal** (subdomain under `bluepeacktechnologies.com`) for those tasks. The mobile home screen includes a dismissible banner linking to the web login.

## Roadmap (placeholder)

Future phases may add: read-only timetable on mobile, assessment reminder push notifications, and offline attendance sync improvements.
