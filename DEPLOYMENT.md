# Production Deployment Guide

## 1) Pre-release checks

Run locally before every release:

```bash
npm ci
npm run release:check
```

`release:check` includes:
- TypeScript check
- Production build
- Dist artifact validation (`index.html`, `assets`, `_headers`, `_redirects`)

## 2) Security note for AI API usage

This app accepts user-provided API keys in browser localStorage and calls provider APIs directly from the client.

- Do not set any private project-wide API key in frontend code.
- For stricter production security, move AI calls behind a backend proxy and use server-side secrets.

## 3) Deploy dist/ to static hosting

This is a static SPA. Build output is in `dist/`.

```bash
npm run build
```

### Netlify
- Build command: `npm run release:check`
- Publish directory: `dist`
- `_headers` and `_redirects` are already included via `public/`.

### Cloudflare Pages
- Build command: `npm run release:check`
- Output directory: `dist`
- `_headers` and `_redirects` are supported from build output.

### Vercel
- Framework preset: `Vite`
- Build command: `npm run release:check`
- Output directory: `dist`
- Add SPA rewrite rule to `index.html` if needed in Vercel project settings.

## 4) Post-deploy smoke checks

- Open `/` and verify language switch works.
- Complete one quick-start playthrough to ending and mirror view.
- Verify browser console has no runtime errors.
