# Flow — Think less. Do more.

A personal task manager built on the **Eisenhower Matrix** (Do First / Schedule / Delegate / Drop). Your tasks are stored privately in your own Google Drive — nothing goes to a server.

## Features

- **Brain Dump** — capture everything on your mind, one line at a time
- **Eisenhower Matrix** priorities (HH / HL / LH / LL)
- **On Demand** and **Routine** task types per section
- **Sections** to group tasks by area of life (Work, Home, etc.)
- **Calendar sidebar** highlighting task start/deadline dates
- **Google Drive sync** — all data lives in your Drive's app-data folder
- **Completed archive** with timestamps

## Tech stack

- React 18 + Vite
- Firebase Auth (Google Sign-In)
- Google Drive API (appDataFolder — private, not visible in My Drive)
- React Router v6

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
3. Add your domain (or `localhost`) to the OAuth authorised origins

### 3. Enable Google Drive API

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Library
2. Enable **Google Drive API**
3. Add the scope `https://www.googleapis.com/auth/drive.appdata` to your OAuth consent screen

### 4. Configure environment variables

```bash
cp .env.example .env
# Fill in your Firebase project credentials
```

### 5. Run locally

```bash
npm run dev
# → http://localhost:5173/flow-app/
```

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

Make sure `vite.config.js` has `base: "/flow-app/"` (already set) and your repo is named `flow-app`.

## Project structure

```
src/
├── constants/       # App-wide constants (priorities, months)
├── utils/           # Pure helpers + Drive API wrappers
├── hooks/           # useDriveSync, useToast
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

Tasks are saved to the **appDataFolder** of the signed-in user's Google Drive. This folder is private — it is not visible in My Drive and cannot be accessed by other apps. No data is sent to any server other than Google's APIs.

## License

MIT
