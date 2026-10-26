# Manual publish checklist (MVP)

After the UI or CLI finishes, download `short.mp4` (1080×1920, H.264 + AAC, VO-only).

**Niche:** Things explained (Space / Biology / Earth).

Use **Copy caption** / **Copy hashtags** in the operator UI, or build from `script.json`:

- Title → platform title / first caption line  
- CTA → body  
- `captionHashtags` → tags  
- Keep `attribution.json` credits handy for descriptions when stock photos were used

---

## YouTube Shorts

1. Open [YouTube Studio](https://studio.youtube.com) → **Create** → **Upload videos**.
2. Select the vertical MP4 (≤60s for Shorts treatment).
3. **Title:** use the Short title (keep under ~100 characters).
4. **Description:** paste caption + hashtags; add stock photographer credits if `attribution.json` lists them.
5. Optional: add `#Shorts` in title or description.
6. Disclose AI-generated content if YouTube prompts / your policy requires it.
7. Visibility: Public / Unlisted → **Publish**.

## Instagram Reels

1. Instagram app → **Create** → **Reel**.
2. Upload `short.mp4` from camera roll / Files (AirDrop / cable / cloud).
3. **Cover:** scrub to a mid-frame with readable on-screen text (avoid the first black/loading frame).
4. **Caption:** paste title + CTA + hashtags from the UI.
5. Do **not** replace the VO with a trending audio rip — this MVP is voiceover-only.
6. Share to Reels (and Feed if desired). Disclose AI where required.

## Facebook Reels

1. Facebook app or your **Page** → **Create Reel**.
2. Upload the **same** MP4.
3. Paste caption + hashtags; post as the Page if that is the brand surface.
4. Keep credits / AI disclosure consistent with IG.

## Before you hit post (all platforms)

- [ ] Phone preview: captions readable, no cut-off at edges  
- [ ] Duration 15–60s, vertical  
- [ ] Caption + hashtags copied  
- [ ] Stock attribution noted when applicable  
- [ ] No uncleared trending music attached  

## Later (not MVP)

Official APIs (YouTube Data API `videos.insert`, Meta Graph Reels) stay optional after M3. Manual upload is the supported path for this MVP.
