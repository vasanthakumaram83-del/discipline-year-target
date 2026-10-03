# daymark · Daily Routine & One-Year Discipline Tracker

A responsive full-stack routine tracker for the fixed plan **September 30, 2026 through September 30, 2027**. The product labels it as a one-year plan and transparently shows **366 calendar dates inclusive**. UI and API reject dates outside the requested endpoints.

## Run locally

1. Install Node.js 22+ and npm.
2. Copy `.env.example` to `.env`. Set a long, random `SESSION_SECRET` before creating accounts; set `AI_API_KEY` only if you want live AI responses.
3. Run `npm install`.
4. Run `npx prisma generate`, then `npm run db:init` to apply and record the checked-in SQLite migration.
5. Run `npm run db:seed` to load the fixed task definitions.
6. Run `npm run dev`, open http://localhost:3000, and create your account.

`npm run db:init` safely initializes a new SQLite file or baselines an already-complete matching schema; it refuses to change a partial schema. The migration is also tracked in Prisma's standard migration history for later `prisma migrate deploy` use.

SQLite is the local development default (`prisma/dev.db`). The Prisma schema keeps persistence isolated so the datasource can be moved to PostgreSQL later.

## Cloud deployment (Vercel + Neon)

The cloud deployment uses the PostgreSQL schema in `prisma-postgres/`; local development continues using the SQLite schema in `prisma/`. The `vercel-build` script generates the PostgreSQL Prisma client, applies checked-in migrations, and builds Next.js.

1. Push this project to a private GitHub repository and import it into a Vercel project.
2. Connect the Neon project to Vercel using Neon’s Vercel Marketplace integration. Make sure it supplies `DATABASE_URL` to the Production environment.
3. In Vercel Project Settings → Environment Variables, add `SESSION_SECRET` with a unique random value. Keep both values out of source control and chat.
4. Deploy. The build applies the PostgreSQL migration automatically; the app URL is then the secure address for the mobile app.

The project manifest also makes the hosted tracker installable from a mobile browser. An Android package that opens the hosted app requires the resulting HTTPS app URL.

## Included

- Password-hashed account signup/login, signed HTTP-only session cookies, and logout.
- Fixed task definitions with per-user/date records. Running, workout, and yoga are separately completable.
- Actual start/end times, duration bounds, study content, subject, personal note, focus and difficulty fields. Task and journal edits save when you leave a field.
- Daily dashboard, date detail, fixed-range calendar, daily/weekly/monthly study analytics, journal, recovery/gain, AI insights, reminders and backup settings.
- Plan progress is clamped before/after the requested range. The dashboard shows plan day and separately counts completed days and streaks.
- Learning total is 7.5 hours/day (7 hours study plus 30 minutes current affairs). Exercise is separate. Logged surplus uses an auditable gain/correction ledger; excuse hours require available gain and retain before/after balances.
- Normal/strict recovery (1×/2×). Recovery is user-confirmed and is stored separately from scheduled task time so it never inflates study totals or gain.
- Sleep stores bed time, wake time and actual duration; the target is 10 PM and six hours. Sleep consistency is shown from recorded dates.
- Optional browser notifications at the routine times. Permission is requested only when enabling; notifications require the page to remain open and browser support/permission.
- AI uses an OpenAI-compatible chat-completions endpoint when `AI_API_KEY` is configured. With no key or a service error, the app displays a clearly marked safe fallback. The AI cannot edit the fixed routine.
- JSON backup export, task CSV export, validated import preview, and explicit choices to keep or replace matching task/journal/sleep records. Import never deletes unrelated history.

## Validation

`npm test` verifies the inclusive date range, plan-day boundaries, progress clamping, study gain and recovery accounting, strict-mode multiplier, and excuse spending. `npm run build` compiles the production application. The main flows were smoke-checked against the local app: registration, task and journal persistence, required study-note validation, outside-range rejection, recovery confirmation, gain/excuse ledgers, and backup preview/restore.

## Defaults and limitations

Current Affairs has no fixed routine time; its reminder is set to a suggested 7:00 AM and can be toggled. Browser notifications can pause if the browser closes. AI model defaults to `gpt-4o-mini`; edit `app/api/ai/route.ts` if your provider requires a different request format.
