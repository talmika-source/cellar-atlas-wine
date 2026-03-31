# Cellar Atlas Wine Only

This folder is a clean wine-only deployment package extracted from the larger Codex workspace.

Included app areas:
- Overview
- Inventory
- Locations
- Producers
- Wine and location APIs
- Current persisted wine/location data in `data/`

Upload/deploy this folder:
- `C:\Users\talmi\OneDrive\Documents\Playground\wine-only-deploy`

Before deploying:
1. Run `npm install`
2. Run `npx prisma generate`
2. Run `npm run build`
3. Run `npm start`

Deployment guides included here:
- `deploy-hostinger-vps.md`
- `deploy-netlify.md`
- `netlify.toml`
- `ecosystem.config.cjs`
- `.nvmrc`

Important hosting note:
- This app currently persists wine and location changes to local JSON files in `data/`.
- That works on a VPS or traditional Node host with a writable filesystem.
- It is not a reliable persistence model for Netlify or other serverless hosts, because filesystem writes are not durable there.

Online scoring note:
- For Vercel or other serverless hosts, use Postgres plus environment variables for online enrichment.
- `DATABASE_URL` should point to your Postgres database.
- `BROWSERLESS_API_TOKEN` lets the app render Vivino and Wine-Searcher pages online when plain fetches are blocked.
- If Vivino is still blocked, set `BROWSERLESS_USE_RESIDENTIAL_PROXY=true`. You can also set `BROWSERLESS_PROXY_COUNTRY` if your Browserless plan supports it.
- `WINE_SEARCHER_API_URL` + `WINE_SEARCHER_API_KEY` and `GLOBAL_WINE_SCORE_API_URL` + `GLOBAL_WINE_SCORE_API_KEY` are optional critic APIs that improve Robert Parker and James Suckling coverage.

Best deployment targets right now:
- Hostinger VPS
- Any Node.js VPS with a writable disk

If you want to use Netlify or another serverless platform, move persistence from `data/*.json` to a real hosted database or platform storage first.
