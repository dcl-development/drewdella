# AGENTS.md — Drew Della

Artist site that intentionally looks like a Google SERP. Live: [drewdella.com](https://drewdella.com).

## Dev framework

This repo follows Jake's dev framework: [jakedcl/dev-framework](https://github.com/jakedcl/dev-framework) (start at its `AGENTS.md`). The framework is the source of truth; if anything in this file conflicts with it, the framework wins.

Read this before exploring. Prefer small diffs. Do not rewrite UI without explaining the approach first.

## Stack

Next.js 16 App Router, React 19, plain CSS, Sanity, Mapbox, Vercel.  
Node 24 (from `.nvmrc`). JS (not TS). Tailwind is **not** used.

## Commands

```sh
npm install
cp .env.example .env.local   # only if missing
npm run dev                  # http://localhost:3000
```

Sanity dataset is public-read — pages render without tokens. Content comes only from Sanity. There are no code fallbacks or backup catalogs. `scripts/seed-sanity.mjs` (`npm run seed:sanity`) fills empty Studio fields once and never overwrites a value already set. Fill `.env.local` only for Maps / video sync / chat writes / revalidate / that seed (see `.env.example`). Never put `SANITY_API_TOKEN` in `NEXT_PUBLIC_*`.

## Layout

| Path | Role |
|------|------|
| `app/(serp)/` | Tab routes (`/`, music, images, videos, blog, …) |
| `app/api/` | `chat`, `videos`, `videos-sync`, `search`, `revalidate` |
| `src/views/` | One folder per tab page |
| `src/components/` | Shared UI (Header, NavTabs, SearchResults, HangoutsChat, Map, …) |
| `src/lib/` | Content, search, SEO, Sanity client helpers |
| `lib/` | Server helpers: chat, rate limit, YouTube cache |
| `studio/` | Sanity schemas. The only Studio is the embedded one at `/studio` (drewdella.com/studio). The hosted Studio at drewdella.sanity.studio is retired; do not redeploy it. |
| `app/globals.css` | Global styles; `--ui-zoom: 1.2` scales the public site |

`/home` = old logo landing. `/` = All tab. Shop empty state is intentional (not a 404).

## Product / design taste

- SERP joke: blue titles, green cites, gray snippets. Keep that language.
- Functional first; funk via images/CSS, not new component libraries.
- Real copy only. No lorem. No “Welcome to your app.”
- Every surface needs empty, loading, and error states.
- Prefer Helvetica/Arial stacks already in use. Don’t add Inter/system rebrands.
- Don’t add auth, a second DB, or another UI kit unless the task needs it.
- Explain the approach before large rewrites.

## Hotspots (common edit targets)

- Tabs: `src/components/NavTabs/` — scrollable; edge fades when overflow
- SERP result chrome: `src/components/SearchResults/`
- Hangouts widget: `src/components/HangoutsChat/` (fixed bottom-left)
- XP promo popup: `src/views/AllPage/` (`.win-popup-dock`, fixed bottom-right)
- Fixed bottom docks: `src/lib/useVisualViewportBottom.js` — keeps them above mobile chrome
- YouTube cache: `lib/youtubeVideos.js` — decode HTML entities on titles (`&amp;` → `&`); cron sync via `/api/videos-sync`
- Site search: `src/lib/siteSearch.js` + `src/lib/searchIndex.js`

## Agent efficiency

1. Grep/read the hotspot above before scanning the whole tree.
2. Match existing patterns (plain CSS files beside components). Don’t introduce Tailwind/shadcn.
3. Keep commits small and descriptive. Prefer feature branches; merge to `main` when the user asks to ship.
4. Skip lengthy browser QA unless asked — the owner often verifies UI themselves.
5. Don’t invent CMS fields; check `studio/schemaTypes/` first.
6. Studio UI should stay at native scale (`html:has(.studio-root) { zoom: 1 }`).
