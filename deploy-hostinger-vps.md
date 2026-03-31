# Hostinger VPS Deployment

This package is ready for a traditional Node.js VPS deployment.

## 1. Upload the app

Upload the contents of this folder to your VPS, for example:

`/var/www/cellar-atlas-wine`

Keep these directories:
- `app`
- `components`
- `lib`
- `styles`
- `prisma`
- `scripts`
- `data`

Do not upload:
- `.next`
- `node_modules`
- local log files

## 2. Install Node.js 20

This app is pinned to Node `20.x` in `package.json` and `.nvmrc`.

## 3. Install dependencies and build

```bash
npm install
npx prisma generate
npm run build
```

## 4. Start with PM2

Install PM2 if needed:

```bash
npm install -g pm2
```

Start the app:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 5. Put Nginx in front of it

Example Nginx server block:

```nginx
server {
    listen 80;
    server_name wine.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable SSL with Let's Encrypt.

## 6. Health check

Use:

`/api/health`

Example:

`https://wine.yourdomain.com/api/health`

## 7. Important persistence note

This app currently stores wine and location data in:
- `data/wines.json`
- `data/locations.json`

That is suitable for a VPS as long as:
- the `data` folder stays writable
- your deploy process does not overwrite those files
- you keep backups of the `data` folder

For a stronger production setup later, move persistence to Postgres.
