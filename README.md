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
- `WINE_SEARCHER_API_URL` + `WINE_SEARCHER_API_KEY` add Wine-Searcher critic lookups.
- `LWIN_API_URL` + `LWIN_API_KEY` and `OPEN_WINE_DATA_API_URL` + `OPEN_WINE_DATA_API_KEY` can enrich missing metadata like region, country, grape, and style.
- `BRIGHTDATA_BROWSER_AUTH` or `BRIGHTDATA_BROWSER_USERNAME` + `BRIGHTDATA_BROWSER_PASSWORD` enables Bright Data as the primary managed browser for Vivino rendering.
- `BRIGHTDATA_BROWSER_WS_ENDPOINT` can be used if Bright Data gives you a custom browser WebSocket endpoint.
- `BROWSERLESS_API_TOKEN` lets the app render Vivino and Wine-Searcher pages online when plain fetches are blocked.
- If Vivino is still blocked, set `BROWSERLESS_USE_RESIDENTIAL_PROXY=true`. You can also set `BROWSERLESS_PROXY_COUNTRY` if your Browserless plan supports it.
- `WINE_SEARCHER_API_URL` + `WINE_SEARCHER_API_KEY` and `GLOBAL_WINE_SCORE_API_URL` + `GLOBAL_WINE_SCORE_API_KEY` are optional critic APIs that improve Robert Parker and James Suckling coverage.

Current production recommendation:
- Use `Wine-Searcher` and direct `Global Wine Score` for score enrichment.
- Use `LWIN` and `Open Wine Data` for metadata only.
- Keep `Vivino` as best-effort enrichment plus manual link/manual score when needed.
- RapidAPI score providers are intentionally not part of the active production refresh flow because they proved unreliable on free tiers.

Best deployment targets right now:
- Hostinger VPS
- Any Node.js VPS with a writable disk

If you want to use Netlify or another serverless platform, move persistence from `data/*.json` to a real hosted database or platform storage first.
