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
- Two routes: `/` → `TaskComponent`, `/about` → `AboutComponent`
- `DataService` is the sole HTTP layer; uses `HttpClient` with relative URL `/api/`
- `TaskComponent` holds three separate arrays (`todoTasks`, `doingTasks`, `doneTasks`) — the board re-fetches all tasks from the API after every mutation
- Drag-and-drop between columns uses `@angular/cdk/drag-drop` (`cdkDropListGroup` on the row, `cdkDropList` per column); on drop, `persistColumnOrder()` updates every task in the affected column(s)
- `Task` interface is defined and exported from `components/task/task.ts`

**Server** (`server/`):
- Express on port 3000
- REST API under `/api/`: `GET /tasks`, `POST /task`, `PUT /task/:id`, `DELETE /task/:id`
- MongoDB via the official `mongodb` driver; connection URI from `MONGODB_URI` env var (defaults to `mongodb://localhost:27017`)
- Collection `tasks`; fields: `title`, `state` ("To Do" | "In Progress" | "Done"), `position` (int), `date`
- Tasks returned sorted by date descending, then position ascending

**Docker** (root `docker-compose.yml`):
- `client`: multi-stage build (Node build → nginx); nginx proxies `/api/` to the `server` container and serves Angular with HTML5 pushstate fallback
- `server`: Node 22 Alpine, inherits `MONGODB_URI=mongodb://mongo:27017`
- `mongo`: official Mongo 7 image with a named volume for persistence
