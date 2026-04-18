# Universal Transmissions Oracle

This is the deployable Next.js version of the Codex Oracle route assembled from the provided frontend and backend archives.

## Deploy Target

Deploy this folder:

```txt
universal-transmissions-deployable/universal-transmissions
```

Do not deploy `oracle-shell/`; that folder is only a static preview/debug shell.

## Included

- `src/app/oracle/page.tsx` with the updated Oracle UI
- `src/components/oracle/CosmicBackground.tsx`
- `src/app/api/oracle/*` backend proxy, TTS, and usage routes
- `public/oracle/codex-oracle-bg-animation.html`
- `public/oracle/correspondence.csv`
- `public/oracle/glyphs/*`
- `public/fonts/CODEX_2.ttf`
- `vercel.json` cache headers

## Required Environment

Copy `.env.example` to `.env.local` for local development and fill values as needed.

The Oracle chat proxy uses:

```txt
ORACLE_BACKEND_URL=https://oracle.hakanhisim.net
```

Supabase/Auth keys are needed for real account/usage behavior. Without them, local UI builds still work, but account-backed plan features will not be functional.

## Commands

```powershell
npm install
npm run dev
npm run build
```
