# Mid-Chain Office Hours Day — landing page + booking

Static landing page (`index.html`) + one booking page (`apply.html`, one host per URL) + two Vercel serverless functions that read/write the Notion databases. No third-party form tool.

## How booking works
1. A host is `Status = Approved` + `Published ✓` in Notion **🎤 Office Hours Hosts** (with `Availability` hour blocks, `Slug`).
2. `/apply?host=<slug>` shows that host, slices each availability block into 20-minute slots, greys out slots already held.
3. Submitting creates a row in **📋 Office Hours Applications** with `Decision = Pending`, `Slot`, `Slot Start`, `Calendar Link`, and holds the slot. `Max Bookings` is enforced.
4. The host sets `Decision` in Notion → the Notion automations send the approval / decline email (see `Office-Hours-Notion-Email-Automations-v1.0`).

Per-host links (paste anywhere): `/apply?host=eli-ben-sasson` · `/apply?host=saul-rejwan` · `/apply?host=dror-avieli`. A new host gets a link the moment they are Approved + Published — no code change.

## One-time setup (Amit, ~4 minutes)
1. notion.so/profile/integrations → **New integration** → name `Office Hours booking`, workspace = the community workspace, capabilities: read + insert content → copy the secret.
2. In Notion, open **🪑 Office Hours — Sun 25 Oct 2026** → `…` menu → **Connections** → add `Office Hours booking` (this covers both databases beneath it).
3. Vercel → project → **Settings → Environment Variables** → add `NOTION_TOKEN` = the secret (Production + Preview) → **Redeploy**.
Until step 3 is done, `/apply` shows "Applications aren't open yet" and nothing breaks.

## Editing
- `index.html` → `HOSTS` list at the top of the `<script>`: `published`, `bookingUrl`, order, photo.
- `api/_notion.js` → `EVENT_DATE`, `TZ_OFFSET`, `SLOT_MINUTES`, database IDs.
- Every push to `main` deploys.
