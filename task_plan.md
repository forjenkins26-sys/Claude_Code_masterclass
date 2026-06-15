# task_plan.md — TestPlanBuddy

> BLAST Protocol — updated after every phase.

## Mission
Lightweight React + Express app: enter Jira ID → fetch issue → generate formal QA Test Plan → render on screen + download as Markdown.

## Phases

### Phase 0: Init ✅
- [x] `.env` filled (JIRA_EMAIL, JIRA_TOKEN, JIRA_URL, GROQ_KEY)
- [x] `task_plan.md` created
- [x] `findings.md` exists
- [x] `progress.md` exists
- [x] `CLAUDE.md` schema defined

### Phase 1: Blueprint ✅
- [x] North Star: Enter Jira ID → get formal QA Test Plan (render + download)
- [x] Integrations: Jira Cloud REST + GROQ API
- [x] Source of Truth: single Jira issue (live fetch)
- [x] Delivery: on-screen render + `.md` download
- [x] Rules: formal tone, no invented data, TBD for gaps, secrets in `.env` only
- [x] Data schema confirmed in CLAUDE-schema.md

### Phase 2: Link ✅
- [x] `tools/jiraClient.js` — fetch + normalize Jira issue
- [x] `tools/groqClient.js` — generate test plan JSON via GROQ
- [x] `tools/testPlan.js` — render JSON → Markdown
- [x] Handshake test: ✅ Jira PASS (SCRUM-121 fetched OK)

### Phase 3: Architect ✅
- [x] `server.js` — Express v4 proxy (POST /api/generate, GET /api/handshake)
- [x] `package.json` — express, cors, dotenv deps installed
- [x] React client deps installed

### Phase 4: Stylize ✅
- [x] React frontend — Generate tab + Settings tab
- [x] PlanViewer — 13 sections rendered cleanly
- [x] Download .md button
- [x] React build — `client/dist/` ✅ (33 modules, 151KB)
- [x] Server running on `http://localhost:3001`

### Phase 5: Trigger — IN PROGRESS
- [ ] Open `http://localhost:3001` in browser
- [ ] Enter `SCRUM-121` → click Generate
- [ ] Verify 13 sections render
- [ ] Download `.md` and verify content
- [ ] Update CLAUDE.md Maintenance Log

## File Structure
```
testplanbuddy/
├── .env                    # secrets (never commit)
├── server.js               # Express proxy
├── package.json
├── tools/
│   ├── jiraClient.js       # Jira fetch + normalize
│   ├── groqClient.js       # GROQ generate
│   └── testPlan.js         # JSON → Markdown
├── architecture/
│   ├── jira-fetch.md
│   ├── groq-generate.md
│   └── test-plan-template.md
└── client/                 # React frontend
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── Settings.jsx
    │   │   ├── Generator.jsx
    │   │   └── PlanViewer.jsx
    │   └── index.jsx
    └── package.json
```
