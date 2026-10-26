# YouTube Shorts upload — OAuth setup (M4 spike)

Semi-auto path: export a vertical MP4, then upload with YouTube Data API v3 `videos.insert` when OAuth credentials are present. **Do not commit secrets.**

Meta Instagram / Facebook Reels stay manual for MVP — see [meta-reels-api-blockers.md](./meta-reels-api-blockers.md).

---

## 1. Create a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. **Select a project** → **New project** (e.g. `things-explained-shorts`).
3. Note the project name; billing is usually not required for modest upload testing.

## 2. Enable YouTube Data API v3

1. **APIs & Services** → **Library**.
2. Search **YouTube Data API v3** → **Enable**.

## 3. Configure the OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**.
2. User type: **External** (or Internal if Workspace-only).
3. App name: e.g. `Things explained Shorts`.
4. Support email: your address.
5. Scopes (add when prompted, or under **Edit app** → **Scopes**):
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly` (optional; channel check)
6. **Test users:** while the app is in **Testing**, add the Google account that owns the YouTube channel.
7. Publishing status can stay **Testing** for personal use (refresh tokens for test users expire after ~7 days in some Google policies — re-run auth if uploads start failing with `invalid_grant`).

## 4. Create an OAuth client

1. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
2. Application type: **Desktop app** (recommended for this CLI) **or** **Web application**.
3. If Web: under **Authorized redirect URIs** add exactly:

   ```text
   http://localhost:8765/oauth2callback
   ```

   Desktop clients accept the loopback redirect used by the auth CLI.
4. Download is optional — **do not commit** `client_secret*.json`. Copy values into `.env` instead:

| Env var | Where |
|---------|--------|
| `YOUTUBE_CLIENT_ID` | Client ID |
| `YOUTUBE_CLIENT_SECRET` | Client secret |
| `YOUTUBE_REDIRECT_URI` | Optional; default `http://localhost:8765/oauth2callback` |

## 5. One-time local auth (refresh token)

```bash
cp .env.example .env
# Fill YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET

npm install
npm run youtube:auth
```

1. Browser opens Google consent → sign in as the **channel owner**.
2. Allow upload access.
3. Terminal prints `YOUTUBE_REFRESH_TOKEN=…` — paste into `.env`.
4. Never commit `.env`, token JSON, or client secret files (gitignored).

## 6. Upload a Short

Generate or locate an MP4 first:

```bash
npm run generate -- --mock
# → output/short-<id>/short.mp4
```

Then:

```bash
# Newest short.mp4 under output/
npm run upload-youtube

# Explicit file
npm run upload-youtube -- --file output/short-…/short.mp4

# Safer while testing (default)
npm run upload-youtube -- --privacy private
```

Or use the operator UI (**Upload to YouTube**) when credentials are configured — `npm run ui`.

### What the spike sends

- `videos.insert` with `snippet` + `status`
- Vertical file as-is (your pipeline already exports **1080×1920**, ≤60s target)
- Title from `script.json` (or `--title`); appends `#Shorts` when missing
- Description: CTA + hashtags + `#Shorts`
- Category **27** (Education) — fits “Things explained”
- Default privacy: **private** (`YOUTUBE_PRIVACY_STATUS` or `--privacy`)

YouTube classifies Shorts from duration + vertical aspect; `#Shorts` helps discovery.

## 7. Env reference (YouTube only)

| Variable | Required | Purpose |
|----------|----------|---------|
| `YOUTUBE_CLIENT_ID` | Yes for upload | OAuth client ID |
| `YOUTUBE_CLIENT_SECRET` | Yes for upload | OAuth client secret |
| `YOUTUBE_REFRESH_TOKEN` | Yes for upload | From `npm run youtube:auth` |
| `YOUTUBE_REDIRECT_URI` | No | Default localhost callback |
| `YOUTUBE_PRIVACY_STATUS` | No | `private` (default) / `unlisted` / `public` |

`/api/env-status` and the UI pill only expose **booleans** (configured or not) — never token values.

## 8. Common failures

| Symptom | Fix |
|---------|-----|
| `access_denied` / app not verified | Add yourself as OAuth **test user** |
| `redirect_uri_mismatch` | Exact match: `http://localhost:8765/oauth2callback` |
| `invalid_grant` | Re-run `npm run youtube:auth`; check test-user / token expiry |
| Quota exceeded | Wait or request quota increase in Cloud Console |
| Upload OK but not on Shorts shelf | Confirm ≤60s, 9:16, and `#Shorts` in title/description |

## 9. Security

- Secrets only in local `.env` (gitignored).
- `.env.example` has empty placeholders.
- Prefer **private** uploads until you trust the spike.
- Revoke access anytime: [Google Account → Third-party access](https://myaccount.google.com/permissions).
