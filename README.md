# Flow — Think less. Do more.

A personal task manager built on the **Eisenhower Matrix** (Do First / Schedule / Delegate / Drop). Tasks are stored in a MongoDB database on a server you run locally, with Firebase handling Google Sign-In.

## Features

- **Brain Dump** — capture everything on your mind, one line at a time
- **Eisenhower Matrix** priorities (HH / HL / LH / LL)
- **On Demand** and **Routine** task types per section
- **Sections** to group tasks by area of life (Work, Home, etc.)
- **Calendar sidebar** highlighting task start/deadline dates
- **MongoDB sync** — all data lives in a single Mongo server, keyed per user
- **Completed archive** with timestamps

## Tech stack

- React 18 + Vite (frontend, deployable to GitHub Pages)
- Firebase Auth (Google Sign-In, used only for identity)
- Express + MongoDB (local server, see `/server`)
- React Router v6

## Architecture

```
┌──────────────┐   Firebase ID token   ┌───────────────────┐        ┌─────────┐
│  React app   │ ────────────────────▶ │ Express API server │ ─────▶ │ MongoDB │
│ (GitHub      │ ◀──────────────────── │  (localhost:4000)  │ ◀───── │ (local) │
│  Pages)      │      JSON data        └───────────────────┘        └─────────┘
└──────────────┘
```

The React app can be hosted on GitHub Pages while the API server + MongoDB run on your own machine (`localhost:4000`). Firebase Auth is used only to identify the user (Google Sign-In) — no OAuth Drive scopes are requested. Every request to the server carries the user's Firebase ID token, which the server verifies and maps to a MongoDB document keyed by the Firebase UID.

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/flow-app.git
cd flow-app
npm install
```

### 2. Set up Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Google** sign-in
3. Add your domain (or `localhost`, and your GitHub Pages domain) to the OAuth authorised origins

### 3. Set up MongoDB + the API server

1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and make sure it's running locally (default `mongodb://127.0.0.1:27017`).
2. Install and configure the server:
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Set FIREBASE_PROJECT_ID to the same value as VITE_FIREBASE_PROJECT_ID
   npm start
   # → http://localhost:4000
   ```
   The server exposes `/api/data` (tasks/sections/settings) and `/api/settings/gemini-key`, all guarded by Firebase ID token verification.

### 4. Configure environment variables (frontend)

```bash
cp .env.example .env
# Fill in your Firebase project credentials
# VITE_API_BASE_URL should point at your local server, e.g. http://localhost:4000
```

### 5. Run locally

```bash
npm run dev
# → http://localhost:5173/flow-app/
```

Make sure the server (`server/`) is running in a separate terminal at the same time.

### 6. Build for production

```bash
npm run build
# Output in dist/
```

## Deploy to GitHub Pages

```bash
# Build
npm run build

# Push the dist/ folder to gh-pages branch
npx gh-pages -d dist
```

Make sure `vite.config.js` has `base: "/flow-app/"` (already set) and your repo is named `flow-app`. Since GitHub Pages only serves static files, the API server + MongoDB must be running somewhere reachable from your browser (e.g. your own PC on `localhost:4000` while you test, or a hosted server later) — set `VITE_API_BASE_URL` accordingly before building.

## Project structure

```
server/               # Express + MongoDB API (local data server)
├── index.js
└── package.json

src/
├── constants/       # App-wide constants (priorities, months)
├── utils/           # Pure helpers + API client (apiClient.js)
├── hooks/           # useDataSync, useToast
├── pages/           # RootApp — top-level state and routing
└── components/
    ├── auth/        # LoginScreen
    ├── calendar/    # Calendar sidebar
    ├── common/      # Field, Modal, Toast, styles
    ├── completed/   # CompletedScreen
    ├── sections/    # SectionsScreen, AddSectionModal
    └── tasks/       # AppScreen, TaskCard, BrainDumpModal, EditTaskModal
```

## Privacy

Tasks are saved to a MongoDB database on the server you run (by default, your own machine). Each user's data is stored in a document keyed by their Firebase UID, isolated from other users. No data is sent to Google Drive or any third-party storage.

## License

MIT
