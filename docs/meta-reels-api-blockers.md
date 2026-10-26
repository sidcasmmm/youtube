# Meta Instagram / Facebook Reels — API blockers (M4 notes)

**Decision for MVP:** keep **manual** upload for Instagram Reels and Facebook Reels. This doc records why a YouTube-style OAuth spike is **not** enough for Meta, and what must be true before a later semi-auto path.

YouTube Shorts upload spike: [youtube-oauth-setup.md](./youtube-oauth-setup.md).

---

## Summary

| Platform | Official publish path | MVP stance | Main blockers |
|----------|----------------------|------------|---------------|
| YouTube Shorts | Data API v3 `videos.insert` | Spike OK (this milestone) | OAuth client + channel; quota |
| Instagram Reels | Instagram Graph / Content Publishing (`media_type=REELS`) | **Manual** | App Review, professional account, public `video_url`, permissions |
| Facebook Reels | Graph API Page/Reels publishing | **Manual** | Page token, app roles, review, product maturity |

Do **not** block the Shorts MVP on full three-platform auto-post.

---

## Instagram Reels (Graph API)

### Prerequisites (product + account)

1. **Instagram professional account** (Creator or Business) — personal consumer accounts cannot publish via Graph.
2. Account **linked to a Facebook Page** (classic Facebook Login / Pages path) **or** use Meta’s Instagram Login / Instagram API with Instagram Login flows where applicable.
3. Meta **developer app** with Instagram product(s) configured.
4. Long-lived user/page tokens with publish scopes — not a simple “API key in `.env`”.

### Permissions (typical Facebook Login path)

Publishing containers generally needs a set such as:

- `instagram_basic` (or newer Instagram Login equivalents like `instagram_business_basic`)
- `instagram_content_publish` (or `instagram_business_content_publish`)
- `pages_show_list` / `pages_read_engagement` when the Page linkage path is used

Exact names shift as Meta migrates Instagram Login vs Facebook Login — verify against current [Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/) docs before building.

### App Review / access levels

| Scenario | What Meta requires |
|----------|-------------------|
| Only **your** business | Still need correct products + tokens; Advanced Access often still gated for publish perms in multi-tenant designs |
| **Tech Provider** / many businesses | **App Review** + Advanced Access; screencast of login + publish; use-case description |
| Development mode | Limited to app roles / test users — fine for a spike, **not** for shipping a generic “post for any creator” tool |

Review asks for a **testable app**, a **screencast** of the OAuth grant, and a successful API call narrative. Incomplete review = no production publish.

### Technical publish constraints (unlike YouTube file upload)

1. **Hosted `video_url`:** create a media container with `media_type=REELS` and a **publicly reachable HTTPS URL** to the MP4. Local `file://` or laptop disk paths do **not** work — you need object storage (S3/R2/GCS) or a tunnel for every publish.
2. **Async container:** poll container `status_code` until `FINISHED`, then `media_publish`. Failures are opaque (codec, duration, URL fetch).
3. **Rate limits / publish quotas** per IG user — easy to hit during iteration.
4. **Format rules:** aspect, duration, size caps change; Reels-specific fields (cover, share-to-feed) differ from feed video.

### Why this blocks “semi-auto like YouTube” for MVP

YouTube spike: OAuth → stream local MP4 → `videos.insert`.  
Instagram: OAuth **plus** App Review path **plus** public CDN URL **plus** two-step container publish. That is a product slice, not a half-day spike.

---

## Facebook Reels

### Prerequisites

1. **Facebook Page** as the brand surface (personal-profile Reels ≠ Page Reels for Graph publishing).
2. Same Meta app; Page access token with video/Reels-related permissions (historically Page publish / video upload families — confirm current Reels Page endpoints).
3. App in Live mode + reviewed permissions for anything beyond app admins.

### Blockers

- Reels-on-Page APIs have lagged IG Content Publishing; docs and availability vary by app type.
- Same **App Review** friction for publish permissions.
- Page vs user token confusion is a common failure mode.
- Still typically wants a **fetchable video URL** or resumable upload protocol — more infra than local CLI stream.

### MVP stance

Post the **same** exported MP4 via Facebook app / Page tools using the [manual checklist](./manual-publish-checklist.md). Automate only after IG Reels path is proven for the same brand account.

---

## Recommended later path (post-MVP)

1. Keep generating local MP4s (current pipeline).
2. Add **object storage** + signed/public URLs for Meta fetches.
3. Spike **IG Reels only** against a single Business account in Development mode (app roles).
4. Submit App Review when the UX is demoable (screencast).
5. Then consider Facebook Page Reels with the same asset URL.
6. Scheduling / multi-tenant / “post to all three” remains out of MVP scope.

---

## Operator messaging

- UI / README: YouTube upload is **optional** when `YOUTUBE_*` env is set.
- IG/FB: checklist + download only until the blockers above are cleared.
- Full three-platform auto-post is **explicitly deferred**.
