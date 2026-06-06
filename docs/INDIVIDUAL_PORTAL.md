# ZSMS Individual Portal

The Individual Portal is for **solo teachers** only. Schools use `/onboarding`; students join through a **school portal** or are registered by a solo teacher.

## Subscriber types

| Type         | Role          | Plan                                          |
| ------------ | ------------- | --------------------------------------------- |
| Solo teacher | `teacher`     | `individual` (K50/mo) or `individual_premium` |
| School       | `headteacher` | Existing school plans (unchanged)             |

Independent student signup (`/join/student`, `student_free`, `student_premium`) has been removed.

## Free trial (all roles)

Every account gets a **2-month free trial** (`trialEndsAt`). After that, **subscription is required** via `/dashboard/billing`.

## Onboarding URLs

**Verify email (required) → Start 2-month trial → Subscribe when trial ends**

- `/join` — solo teacher only
- `/onboarding` — full school signup

Email verification is mandatory before workspace creation. The onboarding cookie is only issued after the verification link is opened.

## Students under a solo teacher

Teachers register students through **User Registration** in their workspace. The enrollment code is for reference; there is no public student self-signup flow.

## Dashboard

- Solo teachers: `/dashboard/solo`

## Renewal

Renew or upgrade via `/dashboard/billing` after the 2-month trial.
