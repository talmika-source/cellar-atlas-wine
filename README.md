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

Best deployment targets right now:
- Hostinger VPS
- Any Node.js VPS with a writable disk

If you want to use Netlify or another serverless platform, move persistence from `data/*.json` to a real hosted database or platform storage first.
