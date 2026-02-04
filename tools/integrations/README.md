# Integrations (Memory / Sheets / Calendar / Alerts)

This folder is scaffolding for online integrations so the agent can store knowledge off-disk.

## What was installed (npm)
- playwright-core (browser automation without downloading bundled browsers)
- googleapis (Google Sheets + Google Calendar)
- @notionhq/client (Notion knowledge base)
- @supabase/supabase-js (online DB)
- sql.js (SQLite in WASM; optional local fallback)

## Next steps (requires your login once)
These require OAuth/API keys, so you will need to authorize once in the browser.

### Google (Sheets + Calendar)
We will create a Google Cloud project + enable APIs:
- Google Sheets API
- Google Calendar API

Then create OAuth client credentials and do a one-time consent flow.

### Notion
- Create a Notion integration
- Share the target workspace/page with the integration
- Provide NOTION_TOKEN + DATABASE_ID

### Supabase (recommended for online memory)
- Create project
- Create a table (e.g. `yt_knowledge` / `notes`)
- Provide SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or anon key with RLS)

## Environment variables
Create a `.env` (do NOT commit) with:

- NOTION_TOKEN=
- NOTION_DATABASE_ID=
- GOOGLE_CLIENT_ID=
- GOOGLE_CLIENT_SECRET=
- GOOGLE_REDIRECT_URI=
- SUPABASE_URL=
- SUPABASE_KEY=

