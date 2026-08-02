# Creator Workspace

A local writing studio for your YouTube channel: track video ideas through a
pipeline, write and autosave scripts, and keep thumbnail/SEO/hook notes next
to each script. Runs entirely on your machine — nothing leaves localhost.

**Stack:** React (Vite + Tailwind) frontend, Node/Express backend, MongoDB database.

## Features

- **Dashboard** — total scripts, word counts, publish-readiness, and what's
  in progress or coming up at a glance
- **Pipeline board** — drag scripts across Idea → Outline → Draft → Recording → Published
- **Calendar** — a month view of publish dates, plus a quick way to schedule
  anything still unscheduled
- **Scripts list** — search and filter by stage or tag
- **Editor** — distraction-free writing with autosave, live word count, a
  publish date, and a notes panel for title ideas, thumbnail notes, SEO tags,
  hooks, description/chapters, and a publish checklist
- **Quick capture** — press `C` (or hit the floating button) from anywhere to
  jot a new idea without leaving what you're doing
- **Channel** — one home for channel identity: name, tagline, niche, content
  pillars, target audience, upload cadence, and social links
- **Voice takes** — record voice-over clips per script, reorder and combine
  them into one downloadable WAV, or download clips individually to finish
  in another editor
- **AI voiceover** — generate a take in a US or British English voice
  entirely in your browser (no API key, nothing leaves your machine after
  the one-time voice download) and save it alongside your own takes

## 1. Install MongoDB locally

If you don't already have MongoDB running:

- **macOS:** `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
- **Windows/Linux:** follow the official install guide at
  https://www.mongodb.com/docs/manual/administration/install-community/

Verify it's running on the default port:

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

(Alternative: use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
and paste its connection string into `server/.env` instead of running MongoDB
locally.)

## 2. Start the backend

```bash
cd server
npm install
cp .env.example .env   # already points at mongodb://127.0.0.1:27017/creator_workspace
npm run dev
```

The API runs at `http://localhost:5000`. Check `http://localhost:5000/api/health`
to confirm it connected to MongoDB.

## 3. Start the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` — the frontend proxies `/api` requests to the
backend automatically (see `client/vite.config.js`).

## Project structure

```
creator-workspace/
├── server/               Express API
│   ├── src/
│   │   ├── models/Script.js       Mongoose schema
│   │   ├── models/Channel.js      singleton channel-profile schema
│   │   ├── models/Recording.js    voice-take schema (human or AI-generated)
│   │   ├── routes/scripts.js      CRUD + stats + tags endpoints
│   │   ├── routes/channel.js      channel profile GET/PUT
│   │   ├── routes/recordings.js   voice-take upload/list/rename/delete
│   │   └── server.js              app entry point
│   ├── uploads/recordings/        stored audio files (gitignored)
│   └── .env                       MONGODB_URI / PORT
└── client/               React app (Vite + Tailwind)
    └── src/
        ├── api/client.js                  axios wrapper for the API
        ├── components/Layout.jsx          sidebar navigation
        ├── components/QuickCapture.jsx    floating idea-capture modal
        ├── components/VoiceRecorder.jsx   record/combine takes + AI voiceover
        └── pages/                         Dashboard, Board, Calendar, Scripts, Editor, Channel
```

## API reference

| Method | Route                             | Description                         |
| ------ | ---------------------------------- | ------------------------------------ |
| GET    | `/api/scripts`                     | list scripts (`?search=&status=&tag=`) |
| GET    | `/api/scripts/tags`                | distinct tag list                    |
| GET    | `/api/scripts/stats`               | dashboard aggregates (incl. `upcoming`, `readyToPublish`) |
| GET    | `/api/scripts/:id`                 | fetch one script                     |
| POST   | `/api/scripts`                     | create a script                      |
| PUT    | `/api/scripts/:id`                 | update a script (`publishDate`, `notes.description`, `notes.checklist`, etc.) |
| DELETE | `/api/scripts/:id`                 | delete a script (also removes its recordings) |
| GET    | `/api/channel`                     | fetch the channel profile (auto-created on first access) |
| PUT    | `/api/channel`                     | update the channel profile           |
| GET    | `/api/scripts/:id/recordings`      | list voice takes for a script        |
| POST   | `/api/scripts/:id/recordings`      | upload a take (raw audio body; `?label=&duration=&mimeType=&source=`) |
| PUT    | `/api/recordings/:id`              | rename or reorder a take             |
| DELETE | `/api/recordings/:id`              | delete a take                        |

Voice takes are served back from `/uploads/recordings/<filename>` for
playback and download. The AI voiceover feature runs entirely client-side
via [`@diffusionstudio/vits-web`](https://www.npmjs.com/package/@diffusionstudio/vits-web)
(Piper neural voices in the browser via WebAssembly) — the generated audio
is uploaded through the same recordings endpoint as a regular take, tagged
`source: "tts"`. The voice model and WASM runtime download from Hugging
Face / a CDN the first time you use a given voice, then are cached by the
browser.

## Customizing

- Pipeline stages live in `client/src/constants.js` — add/rename/reorder as needed.
- Script fields (notes panel, tags, etc.) live in `server/src/models/Script.js`.
- Colors and layout are plain Tailwind classes throughout `client/src`.

## Using this with Claude Code

If you'd rather have Claude Code extend this project on your machine (add
features, change the design, deploy it, etc.), open a terminal in the
`creator-workspace` folder and run `claude`, then describe what you want changed
— Claude Code can read this whole codebase and modify it directly.
