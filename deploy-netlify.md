# Netlify Deployment

This folder now includes `netlify.toml` and will build on Netlify as a Next.js app.

## What is ready

- Node pinned to `20`
- Netlify config added
- `/api/health` added for a simple smoke check
- initial wine/location data can be bundled from `data/**`

## What to expect

The app can be deployed to Netlify, but the current persistence model is still file-based:
- `data/wines.json`
- `data/locations.json`

Netlify does not provide durable local filesystem writes for this kind of app runtime.

That means:
- the app can load
- reads can work
- but edits are not reliable as long-term persistent storage

## Recommended Netlify use

Use this deployment for:
- demo
- design review
- feature review
- read-heavy preview

Do not use it as the final production setup if you need saved changes to persist.

## Netlify deploy steps

1. Create a new site from Git or drag-and-drop this folder through a connected repo flow.
2. Build command:
   `npm run build`
3. Publish directory:
   `.next`
4. Node version:
   `20`

The included `netlify.toml` already sets these values.

## Health check

After deploy, verify:

`/api/health`

## Best next step for real Netlify production

Move persistence away from `data/*.json` to one of:
- hosted Postgres
- Supabase
- Neon
- Netlify Blobs or another managed storage layer

Once persistence is moved off the local filesystem, Netlify becomes a much better fit.
