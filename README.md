# Kanban

A Kanban board for managing tasks across three stages: **To Do**, **In Progress**, and **Done**. Built with the MEAN stack (MongoDB, Express, Angular 19, Node.js).

## Features

- **User accounts** - register and sign in with email and password; each user has their own private board
- **Add tasks** - click *+ Add task* to create a new card in To Do, then type and hit Save
- **Edit tasks** - click the pencil icon on a card to edit inline, then Save or Cancel
- **Markdown support** - task content is rendered as Markdown (bold, lists, code, headings, and more)
- **Drag and drop** - drag cards between columns or reorder within a column
- **Delete tasks** - hover a card and click the X, then confirm
- **Light and dark mode** - toggle in the header; preference is saved across sessions

## Running with Docker

```bash
docker compose up --build
```

The app is served at [http://localhost](http://localhost). MongoDB data is persisted in the `mongo_data` Docker volume.

To set a custom JWT secret (recommended for production):

```bash
JWT_SECRET=your-secret-here docker compose up --build
```

## Local Development

Requires MongoDB running locally on port 27017.

**Server** (from `server/`):
```bash
npm install
npm start        # API server on http://localhost:3000
```

**Client** (from `client/`):
```bash
npm install
npm start        # Dev server on http://localhost:4200 (proxies /api to localhost:3000)
```

## Stack

- [MongoDB](https://www.mongodb.com/) - document storage for tasks and users
- [Express.js](https://expressjs.com/) - REST API server
- [Angular 19](https://angular.io/) - frontend framework
- [Node.js](https://nodejs.org/) - server runtime
- [Angular CDK](https://material.angular.io/cdk/drag-drop/overview) - drag and drop
- [marked](https://marked.js.org/) - Markdown parsing
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) - password hashing
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - JWT authentication
