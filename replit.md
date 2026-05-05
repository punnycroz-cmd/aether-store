# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Aether Studio Landing (`artifacts/aether-landing`)

React + Vite + Tailwind + Framer Motion social prompt marketplace.

### Pages & Routes
- `/` — Landing page
- `/forge` — Image generation (requires auth; guests blocked)
- `/vault` — Personal image history
- `/feed` — Social feed (For You / Trending / Following tabs) + Creator Spotlight + Best of Week
- `/discover` — Public gallery with search, realm filter (Day/Star), sort (Recent/Trending), **tag cloud filter**
- `/store` — Grimoire Store: 6 prompt packs with credits unlock system
- `/challenges` — Grand Trials: weekly challenges with countdown + prizes + **leaderboard podium + voting**
- `/profile` — User profile: gallery, saved prompts, incantation history, **boards tab**, **following tab**
- `/profile/:username` — Public creator profile page

### Key Components
- `SiteNav` — Full nav with Feed/Discover/Store/Challenges/Forge tabs + user avatar dropdown + credits badge + **notifications bell** + **daily streak badge**
- `PromptCard` — Shared social card with like, save, remix, copy, **tag pills**, **star rating badge**, **share-card PNG**, **remix tree**, **save to board**, **creator profile link**
- `CommentsModal` — Comments with **1–5 star rating** submission
- `NotificationsPanel` — Slide-in panel for likes/follows/remix notifications
- `RemixTreeModal` — Visual remix ancestry tree
- `SaveToBoardModal` — Save prompt to named boards/collections
- `CreatorProfilePage` — Public profile: avatar, bio, follower count, prompt grid
- `useLocalStore` — localStorage-persisted: likes, saves, collections, credits, **notifications**, **streak**, **ratings**, **remixTree**, **boards**
- `useAuth` — Google Sign-In (GIS), guest mode, session via `aether_session` cookie

### Social Features (localStorage-only)
- **Tags**: auto-extracted from prompts via `extractTags()` in `lib/utils.ts` (top 5 meaningful words, stop-words filtered)
- **Ratings**: 1–5 stars per prompt, stored per request_id
- **Boards**: named collections users can save prompts into
- **Daily Streak**: tracked with localStorage, badge shown in nav
- **Notifications**: like/follow/remix events, bell badge + slide-in panel
- **Remix Tree**: tracks parent → child remix relationships
- **Challenge Votes**: per-challenge leaderboard votes stored locally

### Auth
- Google OAuth via GIS `renderButton` (Client ID: `206665134027-80oiqn378dq1jo49lgtmaueu0p30mf9a`)
- Backend FastAPI at `https://f70cef08-b1c6-4363-88e3-774e02123f6e-00-1btn7n40xrnba.kirk.replit.dev`
- Proxied through Express at `/api/proxy/*` to bypass CORS

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
