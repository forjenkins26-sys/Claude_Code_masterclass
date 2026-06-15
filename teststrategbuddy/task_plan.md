# task_plan.md — TestStrategyBuddy

> BLAST Protocol — updated after every phase.

## Mission
Lightweight React + Express app: enter Jira ID → fetch feature story → GROQ generates 10-section QA Test Strategy → render on screen (dark/light mode) + download as Markdown → deploy to Vercel.

## RICEPOT
| Letter | Detail |
|---|---|
| R | QA Lead / Test Manager |
| I | Jira story ID (e.g. SCRUM-187) |
| C | Same stack as TestPlanBuddy — Express v4 + React 18 + Vite + GROQ |
| E | Test Strategy for Ecommerce Website.docx — 10-section structure |
| P | Jira REST fetch → GROQ llama-3.3-70b-versatile → 10-section JSON → render |
| O | React UI dark/light toggle, Markdown download, GitHub + Vercel deploy |
| T | Professional QA document tone, formal, no invented data |

## 10 Strategy Sections (from reference doc)
1. Objective
2. Scope (In-scope / Out-of-scope)
3. Focus Areas
4. Approach & Testing Techniques
5. Deliverables
6. Team & Schedule
7. Entry & Exit Criteria
8. Risks & Mitigations
9. Tools & Environment
10. Sign-off & Approvals

## Phases

### Phase 0: Init ✅
- [x] Dummy Jira story created: SCRUM-187 (Login & Dashboard — Ecommerce)
- [x] task_plan.md created
- [x] findings.md path identified
- [x] progress.md path identified
- [x] .env exists at workspace root (same keys reused)

### Phase 1: Blueprint ✅
- [x] RICEPOT analysis complete
- [x] 10 strategy sections defined from reference doc
- [x] Data schema defined (see below)
- [x] Stack confirmed: Express v4 + React 18 + Vite + GROQ
- [x] Vercel deploy plan: `vercel.json` + static build

### Phase 2: Link — IN PROGRESS
- [ ] `tools/jiraClient.js` — reuse/adapt from testplanbuddy
- [ ] `tools/groqClient.js` — new prompt for 10-section strategy JSON
- [ ] `tools/strategyDoc.js` — JSON → Markdown renderer

### Phase 3: Architect
- [ ] `server.js` — POST /api/generate, GET /api/handshake, GET /api/config
- [ ] `package.json` — deps installed
- [ ] `vercel.json` — Vercel routing config

### Phase 4: Stylize
- [ ] React app — dark/light mode toggle (CSS variables)
- [ ] StrategyViewer — 10 sections rendered
- [ ] Settings tab — Jira/GROQ credentials, localStorage
- [ ] Download .md button
- [ ] React build — client/dist/

### Phase 5: Trigger
- [ ] Open http://localhost:3002 in browser
- [ ] Enter SCRUM-187 → Generate
- [ ] Verify 10 sections render in both dark + light mode
- [ ] Download .md and verify content
- [ ] git push to GitHub
- [ ] vercel deploy → live URL
- [ ] Update CLAUDE.md Maintenance Log

## Data Schema

```json
{
  "strategyId": "SCRUM-187",
  "featureName": "string",
  "objective": "string",
  "scope": {
    "inScope": ["string"],
    "outOfScope": ["string"]
  },
  "focusAreas": ["string"],
  "approach": ["string"],
  "deliverables": ["string"],
  "teamAndSchedule": {
    "teamSize": "string",
    "duration": "string",
    "phases": [{"phase": "string", "activity": "string"}]
  },
  "entryCriteria": ["string"],
  "exitCriteria": ["string"],
  "risks": [{"risk": "string", "mitigation": "string"}],
  "tools": ["string"],
  "approvals": [{"role": "string", "name": "TBD", "date": "TBD"}]
}
```

## File Structure
```
teststrategbuddy/
├── server.js
├── package.json
├── vercel.json
├── tools/
│   ├── jiraClient.js
│   ├── groqClient.js
│   └── strategyDoc.js
└── client/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx
        ├── index.jsx
        └── components/
            ├── Generator.jsx
            ├── StrategyViewer.jsx
            └── Settings.jsx
```
