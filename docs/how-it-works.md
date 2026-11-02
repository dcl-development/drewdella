# How it works

Notes on the pieces behind the site that aren't obvious from the pages: where the content lives, how the video list is kept fresh without hitting YouTube on every visit, how the chat is protected, and which keys need locking down.

## Data and access

All content is in Sanity (project `qcu6o4bq`, dataset `production`). The dataset is public-read. There are no code fallbacks or backup catalogs: music, lyrics, blog posts, photos, socials, venues, the shop link, and the contact email render only from Sanity. Empty Studio fields stay empty. `src/lib/sanity.js` is a server-only client (`import "server-only"`) with no write token. Anything named `NEXT_PUBLIC_*` is shipped to the browser, so a Sanity write token must never go in one.

`scripts/seed-sanity.mjs` (`npm run seed:sanity`) copies the old built-in music catalog and the contact email into production. It creates a document only when that document does not exist, and it only fills fields that are missing or blank. It needs `SANITY_API_TOKEN` and does not run as part of the site.

The server uses `SANITY_API_TOKEN` in two places only:

- posting chat messages and keeping the chat rate-limit counters (`lib/chat.js`)
- saving the daily YouTube snapshot (`lib/youtubeVideos.js`, called from `/api/videos-sync`)

The document types are in `studio/schemaTypes/`: `musicRelease`, `song`, `blogPost`, `imageGallery`, `socialLink`, `mapLocation`, `shopLink`, `contact`, `chatMessage` and `youtubeCache`. The only Studio is the embedded one at [drewdella.com/studio](https://drewdella.com/studio) (`/studio`). `public/robots.txt` disallows that path. The separately hosted Studio at drewdella.sanity.studio is retired. `studio/sanity.cli.ts` has no `deployment` block, and `studio/package.json` has no deploy script, so a hosted Studio is not redeployed from this repo. Links that come from the CMS go through `safeHref` (`src/lib/safeHref.js`) before being rendered, so only `http(s)` URLs and same-site paths get through.

## YouTube snapshot

A YouTube search call costs 100 quota units, so visitors never trigger one.

- `vercel.json` schedules a cron at 14:00 UTC every day that calls `/api/videos-sync`.
- That route checks `Authorization: Bearer $CRON_SECRET`. If `CRON_SECRET` isn't set it only allows the request outside production. Without the header it answers 401.
- It fetches the channel's latest videos, drops any whose title or description contains `#` (Shorts), keeps 12, and only writes to Sanity if the list of video ids changed.
- `/api/videos` is read-only. It returns the stored snapshot with CDN cache headers and never calls YouTube.

## Chat

The Hangouts-style widget uses `/api/chat` (`app/api/chat/route.js` and `lib/chat.js`).

- `GET` returns the most recent messages (at most 100).
- `POST` strips HTML tags and trims the name (24 characters) and message (280 characters) before writing to Sanity.
- Two layers of rate limiting apply. An in-memory limiter (`lib/rateLimit.js`, 8 posts and 45 reads per IP per minute) works per serverless instance, so it is best effort. A shared limit is stored in Sanity as `chatRateBucket` documents, 8 posts per IP per minute and 30 per minute overall. The IP is hashed before it is used in a document id, so raw IPs aren't stored.
- There is no CAPTCHA. A Turnstile check would be the next step if spam shows up.

## Maps

Venues are `mapLocation` documents. Each venue needs a `coordinates` geopoint in Studio (drop the pin on the map). The Maps tab (`src/components/Map/Map.jsx`) reads those coordinates from Sanity and does not geocode at runtime. The basemap is [OpenFreeMap](https://openfreemap.org/) Liberty tiles via MapLibre GL, recolored in `googleBasemap.js` to match the previous Google-style palette. No API key is required for the map tiles.

## Search

`src/lib/siteSearch.js` builds an index from the static pages and the Sanity documents (releases, posts, lyrics, socials, venues, gallery images, videos). Results are scored so exact and prefix title matches rank above matches in the body text.

## Environment variables

See `.env.example`.

| Variable | Side | Notes |
|---|---|---|
| `YOUTUBE_API_KEY` | server | restrict to the YouTube Data API v3 in Google Cloud |
| `YOUTUBE_CHANNEL_ID` | server | |
| `SANITY_API_TOKEN` | server | editor token, mark as sensitive on Vercel |
| `CRON_SECRET` | server | required in production for the sync route |

The site renders without any of them because content is public-read. Without the server keys the chat can't post and the video sync can't run.

## Security headers

`next.config.mjs` sets these on every route: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, a `Permissions-Policy` that turns off camera, microphone and geolocation, and `Cross-Origin-Opener-Policy: same-origin-allow-popups`.

## Deploying

Pushing `main` deploys on Vercel. After changing any secret:

1. Check the secrets are marked sensitive and that no old tokens are left in other environments.
2. Redeploy, since `NEXT_PUBLIC_*` values are baked into the client build.
3. Confirm `/api/videos-sync` returns 401 when called without the bearer secret.

`package.json` and `.nvmrc` both ask for Node 24.
