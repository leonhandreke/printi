# printi-next

Web app for [printi](https://github.com/fonsp/printi) — the world's fastest photo printer. Users upload images at `printi.me/<printer-name>`; the server queues them in Postgres and printers poll for new images via long-polling.

<!-- Keep this file up to date as the project evolves or as you learn more about it. -->

## Stack

- Next.js 16 (App Router, `output: "standalone"`, Node 24)
- React 19, Tailwind CSS 4
- PostgreSQL (pg, pg-listen for NOTIFY)
- Canvas + canvas-dither for image processing
- TypeScript throughout

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Server component | Home — lists recently seen printers |
| `/[printerName]` | Client component | Upload page with receipt animation, camera, paste/drop |
| `/share` | Client component | Lists saved "printi friends" from localStorage |
| `/help` / `/help/[slug]` | Server component | Renders `/docs/*.md` as HTML at request time |
| `/api/[printerName]` POST | API route | Receives image uploads (JSON base64 or multipart), enqueues in DB |
| `/api/[printerName]` GET | API route | Long-poll: waits for pg_notify, returns dithered image (PNG or H58) |
| `/api/[printerName]/nextinqueue` GET | API route | Same as above (legacy URL compat) |
| `/[printerName]/manifest.json` | API route | Per-printer PWA manifest |

## Key architecture

- **Image pipeline**: Upload → `insertMessage()` → pg_notify → printer long-polls GET → `queryOldestMessage()` (FOR UPDATE SKIP LOCKED) → `ditherBytesToBwimage()` → `toPng()`/`toH58()`
- **Printer sizes**: `printerSize("printi")` = 576px (80mm), all others 384px (58mm)
- **Middleware** (`src/middleware.ts`): Rewrites legacy POST paths, normalizes printer names to lowercase, sets CORS headers
- **DB schema** (`src/lib/db.ts`): Auto-creates `printi_message` and `printi_seen` tables + notify trigger at startup. Connects via `DATABASE_URL` env var.
