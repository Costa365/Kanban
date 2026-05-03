# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MEAN stack Kanban board: Angular 19 frontend, Express/MongoDB backend.

## Running with Docker (recommended)

```bash
docker compose up --build
```

App is served at http://localhost:80. MongoDB data is persisted in the `mongo_data` Docker volume.

## Local Development (without Docker)

Requires MongoDB running locally on port 27017.

**Client** (from `client/`):
```bash
npm install
npm start        # Dev server on http://localhost:4200 (proxies /api to localhost:3000)
npm run build    # Production build to dist/client/browser/
npm test         # Unit tests (Karma + Jasmine)
```

**Server** (from `server/`):
```bash
npm install
npm start        # API server on http://localhost:3000
```

The client's `proxy.conf.json` forwards `/api/*` to `localhost:3000` during `ng serve`, so no CORS issues locally.

## Architecture

**Client** (`client/src/app/`):
- Three routes: `/login` → `LoginComponent`, `/` → `TaskComponent` (guarded), `/about` → `AboutComponent` (guarded)
- `AuthService` handles login/register via `/api/auth/`, stores JWT + email in `localStorage`
- `AuthInterceptor` attaches `Authorization: Bearer <token>` to all non-auth API requests; auto-logouts on 401
- `AuthGuard` (`canActivate`) redirects unauthenticated users to `/login`
- `DataService` is the sole HTTP layer for tasks; uses `HttpClient` with relative URL `/api/`
- `TaskComponent` holds three separate arrays (`todoTasks`, `doingTasks`, `doneTasks`); add/delete update local state directly (no re-fetch) using the server response. All three `*ngFor` loops use `trackBy: trackById` so updates (e.g. checkbox toggles) patch the existing card DOM instead of remounting it
- Drag-and-drop uses `@angular/cdk/drag-drop` (`cdkDropListGroup` on the board, `cdkDropList` per column); on drop, `persistColumnOrder()` PUTs every task in the affected column(s)
- Adding tasks: clicking "+ Add task" creates an inline editable card at the top of To Do with Save/Cancel buttons; on Save the task is POSTed to the server
- Inline editing: clicking the pencil icon on a card sets `editingId`; an auto-resizing `<textarea>` with `appAutoFocus` replaces the rendered content; Save/Cancel buttons commit or discard changes (Escape also cancels)
- Task content is stored as raw Markdown and rendered via `MarkdownPipe` (wraps `marked`) into `[innerHTML]`; Angular's built-in sanitiser handles XSS
- Sub-task checklists: GFM task list items (`- [ ] foo` / `- [x] foo`) are interactive. The pipe also normalises the empty form `- []` to `- [ ]` before parsing. Marked emits `<input type="checkbox">` which Angular's sanitiser strips, so the pipe rewrites each into `<span class="task-checkbox">` (with `task-checkbox-checked` when ticked); the styles live in global `styles.css` because component-scoped CSS doesn't apply to `[innerHTML]` content. Clicks on `.markdown-body` are handled by `onCheckboxClick`, which finds the clicked checkbox's index by position among siblings and calls `toggleCheckbox`, which flips the Nth `[ ]`/`[x]`/`[]` marker in the raw Markdown and PUTs the task
- `Task` interface exported from `components/task/task.ts`
- `AutoFocusDirective` (`auto-focus.directive.ts`) focuses and selects a textarea on render, also triggers initial auto-resize
- `MarkdownPipe` (`markdown.pipe.ts`) wraps `marked` with `breaks: true, gfm: true`; also normalises `- []` → `- [ ]` and rewrites task-list `<input>` to `<span class="task-checkbox">`
- Light/dark mode: `AppComponent` reads `localStorage` and `prefers-color-scheme`, sets `data-theme` on `<html>`; all colours are CSS custom properties on `:root`
- Responsive header: on mobile (<=600px) nav links, email, and sign-out collapse into a hamburger menu dropdown; `menuOpen` state on `AppComponent` toggles the menu; a backdrop overlay closes it on outside tap

**Server** (`server/`):
- Express on port 3000
- Auth routes (public): `POST /api/auth/register`, `POST /api/auth/login` — returns `{ token, email }`; passwords hashed with `bcryptjs`, JWTs signed with `jsonwebtoken` (secret from `JWT_SECRET` env var)
- Auth middleware (`middleware/auth.js`) verifies JWT on all `/api/` task routes, attaches `req.user = { id, email }`
- Task routes (protected): `GET /tasks`, `POST /task`, `PUT /task/:id`, `DELETE /task/:id`
- All task queries are scoped by `userId` (the authenticated user's MongoDB `_id`)
- On first `GET /tasks`, orphaned tasks (no `userId` field) are migrated to the current user
- MongoDB via the official `mongodb` driver; connection URI from `MONGODB_URI` env var (defaults to `mongodb://localhost:27017`)
- Collections: `users` (email, password hash; unique index on email), `tasks` (title, state, position, date, userId; compound index on `{ userId, date, position }`)
- Tasks returned sorted by date descending, then position ascending
- PUT and DELETE validate the `:id` param with `ObjectId.isValid()` before querying

**Docker** (root `docker-compose.yml`):
- `client`: multi-stage build (Node build → nginx); nginx proxies `/api/` to the `server` container and serves Angular with HTML5 pushstate fallback
- `server`: Node 22 Alpine, inherits `MONGODB_URI=mongodb://mongo:27017` and `JWT_SECRET`
- `mongo`: official Mongo 7 image with a named volume for persistence
