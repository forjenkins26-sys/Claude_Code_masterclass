# api-test-autogen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone React+Express app that takes a Jira Epic key + API base URL, generates a Postman collection from the Epic's acceptance criteria via GROQ, runs it with Newman, and shows a pass/fail summary + report link in the browser.

**Architecture:** Express server with 3 independent pipeline modules (`jiraFetch.ts` → `collectionGen.ts` → `runner.ts`) wired together by one `POST /api/run` route. Single-page React client (Vite) posts to that route and polls nothing — one request, one response, status shown client-side during the wait. Filesystem-only storage (`collections/`, `reports/`), no database.

**Tech Stack:** Node 22 + TypeScript + Express (server), React + Vite (client), `newman` + `newman-reporter-htmlextra` (test runner), GROQ `llama-3.3-70b-versatile` via raw `https` (matches `qabuddy`/`testplanbuddy` pattern — no SDK dependency), Jira REST API v3 direct (basic auth, matches `qabuddy/tools/jiraClient.js` pattern), Node built-in `node:test` for unit tests.

**Location:** `c:\ClaudeCodeMasterclass\api-test-autogen\` — fully standalone, own `package.json`, own `.env`, zero imports from any existing project in this workspace.

---

## File Structure

```
api-test-autogen/
  .env.example
  .gitignore
  package.json                    (root — workspace scripts only)
  server/
    package.json
    tsconfig.json
    src/
      jiraFetch.ts                (Jira REST v3 -> AC text)
      jiraFetch.test.ts
      collectionGen.ts            (GROQ -> Postman Collection v2.1 JSON)
      collectionGen.test.ts
      runner.ts                   (newman.run -> pass/fail result)
      runner.test.ts
      index.ts                    (Express app, POST /api/run, GET /reports/*)
    collections/                  (gitignored, generated)
    reports/                      (gitignored, generated)
  client/
    package.json
    vite.config.ts
    index.html
    src/
      App.tsx                     (single page: form, status, results)
      App.css
      main.tsx
```

Each server file has one job and is independently testable: `jiraFetch` takes credentials+key, returns text. `collectionGen` takes text+baseUrl, returns a JSON object. `runner` takes a file path, returns a result object. `index.ts` only orchestrates — no business logic of its own.

---

### Task 1: Scaffold the standalone project

**Files:**
- Create: `api-test-autogen/package.json`
- Create: `api-test-autogen/.gitignore`
- Create: `api-test-autogen/.env.example`
- Create: `api-test-autogen/server/package.json`
- Create: `api-test-autogen/server/tsconfig.json`

- [ ] **Step 1: Create the root and server package.json files**

`api-test-autogen/package.json`:
```json
{
  "name": "api-test-autogen",
  "private": true,
  "version": "1.0.0",
  "description": "Standalone Jira -> Postman -> Newman -> report pipeline. No shared code with any other project in this workspace.",
  "scripts": {
    "server": "cd server && npm run dev",
    "client": "cd client && npm run dev"
  }
}
```

`api-test-autogen/server/package.json`:
```json
{
  "name": "api-test-autogen-server",
  "private": true,
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "node --import tsx --test src/*.test.ts"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "newman": "^6.2.2",
    "newman-reporter-htmlextra": "^1.23.1"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "tsx": "^4.19.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^22.5.0"
  }
}
```

`api-test-autogen/server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Create `.gitignore` and `.env.example`**

`api-test-autogen/.gitignore`:
```
node_modules/
dist/
.env
server/collections/*.json
server/collections/*.failed.txt
server/reports/
!server/collections/.gitkeep
!server/reports/.gitkeep
```

`api-test-autogen/.env.example`:
```
PORT=4000

# Jira Cloud
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_jira_api_token

# GROQ (own key, not shared with agent-factory-cli's)
GROQ_API_KEY=your_groq_key
```

- [ ] **Step 3: Install server dependencies**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\server"
npm install
```
Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Create placeholder dirs so git tracks the folder structure**

```bash
mkdir -p "c:\ClaudeCodeMasterclass\api-test-autogen\server\collections"
mkdir -p "c:\ClaudeCodeMasterclass\api-test-autogen\server\reports"
touch "c:\ClaudeCodeMasterclass\api-test-autogen\server\collections\.gitkeep"
touch "c:\ClaudeCodeMasterclass\api-test-autogen\server\reports\.gitkeep"
```

- [ ] **Step 5: Commit**

```bash
cd "c:\ClaudeCodeMasterclass"
git add api-test-autogen/package.json api-test-autogen/.gitignore api-test-autogen/.env.example api-test-autogen/server/package.json api-test-autogen/server/tsconfig.json api-test-autogen/server/collections/.gitkeep api-test-autogen/server/reports/.gitkeep
git commit -m "feat(api-test-autogen): scaffold standalone server project"
```

---

### Task 2: `jiraFetch.ts` — fetch Epic ACs from Jira REST API

**Files:**
- Create: `api-test-autogen/server/src/jiraFetch.ts`
- Create: `api-test-autogen/server/src/jiraFetch.test.ts`

- [ ] **Step 1: Write the failing test**

`api-test-autogen/server/src/jiraFetch.test.ts`:
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { flattenAdf } from "./jiraFetch";

test("flattenAdf: flattens a simple paragraph node", () => {
  const adf = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Users must be able to log in." }] }
    ]
  };
  assert.equal(flattenAdf(adf).trim(), "Users must be able to log in.");
});

test("flattenAdf: flattens a bullet list into dash-prefixed lines", () => {
  const adf = {
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "AC1: valid login shows dashboard" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "AC2: invalid login shows error" }] }] }
        ]
      }
    ]
  };
  const result = flattenAdf(adf);
  assert.match(result, /- AC1: valid login shows dashboard/);
  assert.match(result, /- AC2: invalid login shows error/);
});

test("flattenAdf: returns empty string for null/undefined node", () => {
  assert.equal(flattenAdf(null), "");
  assert.equal(flattenAdf(undefined), "");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\server"
npm test
```
Expected: FAIL — `Cannot find module './jiraFetch'` (file doesn't exist yet).

- [ ] **Step 3: Write `jiraFetch.ts`**

```typescript
import https from "node:https";

export interface JiraCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
}

export function flattenAdf(node: AdfNode | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  if (node.content) {
    const text = node.content.map(flattenAdf).join("");
    if (node.type === "paragraph") return text + "\n";
    if (node.type === "heading") return text + "\n";
    if (node.type === "listItem") return "- " + text;
    if (node.type === "bulletList" || node.type === "orderedList") return text;
    return text;
  }
  return "";
}

export function fetchEpicAcs(issueKey: string, creds: JiraCredentials): Promise<string> {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64");
    const url = new URL(`/rest/api/3/issue/${issueKey}`, creds.baseUrl);

    const req = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}?fields=summary,description`,
        method: "GET",
        headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Jira ${res.statusCode}: ${data}`));
          }
          try {
            const json = JSON.parse(data);
            const summary: string = json.fields.summary || "";
            const description = flattenAdf(json.fields.description);
            resolve(`Summary: ${summary}\n\n${description}`.trim());
          } catch (e) {
            reject(new Error(`Jira response parse error: ${(e as Error).message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\server"
npm test
```
Expected: PASS — 3 tests green. (`fetchEpicAcs` itself is not unit-tested here — it's a thin network wrapper, covered by the Task 6 manual smoke test instead, per YAGNI on mocking `https`.)

- [ ] **Step 5: Commit**

```bash
cd "c:\ClaudeCodeMasterclass"
git add api-test-autogen/server/src/jiraFetch.ts api-test-autogen/server/src/jiraFetch.test.ts
git commit -m "feat(api-test-autogen): add Jira REST API AC fetcher"
```

---

### Task 3: `collectionGen.ts` — GROQ generates a Postman Collection v2.1 JSON

**Files:**
- Create: `api-test-autogen/server/src/collectionGen.ts`
- Create: `api-test-autogen/server/src/collectionGen.test.ts`

- [ ] **Step 1: Write the failing test**

`api-test-autogen/server/src/collectionGen.test.ts`:
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson, buildPrompt } from "./collectionGen";

test("extractJson: parses clean JSON string", () => {
  const result = extractJson('{"info":{"name":"test"}}');
  assert.deepEqual(result, { info: { name: "test" } });
});

test("extractJson: strips markdown fences before parsing", () => {
  const result = extractJson('```json\n{"info":{"name":"test"}}\n```');
  assert.deepEqual(result, { info: { name: "test" } });
});

test("extractJson: throws on invalid JSON", () => {
  assert.throws(() => extractJson("not json at all"));
});

test("buildPrompt: includes the AC text and base URL", () => {
  const prompt = buildPrompt("Users must log in with email+password", "https://api.example.com");
  assert.match(prompt, /Users must log in with email\+password/);
  assert.match(prompt, /https:\/\/api\.example\.com/);
  assert.match(prompt, /Postman Collection/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\server"
npm test
```
Expected: FAIL — `Cannot find module './collectionGen'`.

- [ ] **Step 3: Write `collectionGen.ts`**

```typescript
import https from "node:https";

export function extractJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export function buildPrompt(acText: string, baseUrl: string): string {
  return `You are a senior QA automation engineer. Generate a Postman Collection v2.1 JSON that tests the API described by these acceptance criteria.

Base URL: ${baseUrl}
Acceptance Criteria:
${acText}

Rules:
- Output ONLY valid JSON. No markdown fences, no explanation, no trailing commentary.
- Root object must have "info" (with "name" and "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json") and "item" (array of requests).
- Each request item must have a "name", "request" (method, url built from ${baseUrl}, header, body if needed), and an "event" of type "test" with a pm.test() script asserting the expected behavior from the acceptance criteria (status code and/or response body checks).
- Cover the happy path AND at least one negative/error case per distinct endpoint implied by the acceptance criteria.
- Do not invent endpoints not implied by the acceptance criteria.`;
}

interface GroqConfig {
  apiKey: string;
  model?: string;
}

function groqPost(prompt: string, cfg: GroqConfig): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: cfg.model || "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const req = https.request(
      {
        hostname: "api.groq.com",
        path: "/openai/v1/chat/completions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`GROQ ${res.statusCode}: ${data}`));
          }
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.choices[0].message.content as string);
          } catch (e) {
            reject(new Error(`GROQ response parse error: ${(e as Error).message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export async function generateCollection(
  acText: string,
  baseUrl: string,
  cfg: GroqConfig
): Promise<{ collection: unknown; rawOutput: string }> {
  const prompt = buildPrompt(acText, baseUrl);

  let rawOutput = await groqPost(prompt, cfg);
  try {
    return { collection: extractJson(rawOutput), rawOutput };
  } catch {
    // Retry once with a stricter instruction (spec: Error Handling section)
    const stricterPrompt = `${prompt}\n\nYour previous response was not valid JSON. Output ONLY the JSON object, starting with { and ending with }. Nothing else.`;
    rawOutput = await groqPost(stricterPrompt, cfg);
    return { collection: extractJson(rawOutput), rawOutput }; // throws if still invalid — caller handles
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\server"
npm test
```
Expected: PASS — all 4 new tests green plus the 3 from Task 2 (7 total).

- [ ] **Step 5: Commit**

```bash
cd "c:\ClaudeCodeMasterclass"
git add api-test-autogen/server/src/collectionGen.ts api-test-autogen/server/src/collectionGen.test.ts
git commit -m "feat(api-test-autogen): add GROQ Postman collection generator"
```

---

### Task 4: `runner.ts` — run the collection via Newman

**Files:**
- Create: `api-test-autogen/server/src/runner.ts`
- Create: `api-test-autogen/server/src/runner.test.ts`

- [ ] **Step 1: Write the failing test**

`api-test-autogen/server/src/runner.test.ts`:
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportDir } from "./runner";

test("buildReportDir: includes epic key and a timestamp segment", () => {
  const dir = buildReportDir("SCRUM-48", "/repo/reports");
  assert.match(dir, /SCRUM-48-\d{8}T\d{6}/);
  assert.match(dir, /^\/repo\/reports\//);
});

test("buildReportDir: different calls produce different paths", async () => {
  const a = buildReportDir("SCRUM-48", "/repo/reports");
  await new Promise((r) => setTimeout(r, 1100)); // ensure second-resolution timestamp differs
  const b = buildReportDir("SCRUM-48", "/repo/reports");
  assert.notEqual(a, b);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\server"
npm test
```
Expected: FAIL — `Cannot find module './runner'`.

- [ ] **Step 3: Write `runner.ts`**

```typescript
import path from "node:path";
import newman from "newman";

export function buildReportDir(epicKey: string, reportsBaseDir: string): string {
  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  return path.join(reportsBaseDir, `${epicKey}-${ts}`);
}

export interface RunResult {
  ok: boolean;
  totalRequests: number;
  totalFailures: number;
  reportDir: string;
  reportFile: string;
  error?: string;
}

export function runCollection(
  collectionPath: string,
  epicKey: string,
  reportsBaseDir: string
): Promise<RunResult> {
  const reportDir = buildReportDir(epicKey, reportsBaseDir);

  return new Promise((resolve) => {
    newman.run(
      {
        collection: collectionPath,
        reporters: ["cli", "htmlextra"],
        reporter: {
          htmlextra: {
            export: path.join(reportDir, "report.html"),
          },
        },
      },
      (err, summary) => {
        if (err) {
          return resolve({
            ok: false,
            totalRequests: 0,
            totalFailures: 0,
            reportDir,
            reportFile: "",
            error: err.message,
          });
        }
        const totalFailures = summary.run.failures.length;
        resolve({
          ok: totalFailures === 0,
          totalRequests: summary.run.stats.requests.total,
          totalFailures,
          reportDir,
          reportFile: path.join(reportDir, "report.html"),
        });
      }
    );
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\server"
npm test
```
Expected: PASS — all tests green (`runCollection` itself is exercised by the Task 6 manual smoke test, not mocked here — matches Task 2's approach for network/process-spawning code).

- [ ] **Step 5: Commit**

```bash
cd "c:\ClaudeCodeMasterclass"
git add api-test-autogen/server/src/runner.ts api-test-autogen/server/src/runner.test.ts
git commit -m "feat(api-test-autogen): add Newman collection runner"
```

---

### Task 5: `index.ts` — Express app wiring the pipeline together

**Files:**
- Create: `api-test-autogen/server/src/index.ts`

- [ ] **Step 1: Write `index.ts`**

No new unit test for this file — it's a thin orchestrator (per spec: "no logic of its own beyond calling the three in sequence"); it is exercised end-to-end by Task 6's manual smoke test.

```typescript
import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fetchEpicAcs } from "./jiraFetch";
import { generateCollection } from "./collectionGen";
import { runCollection } from "./runner";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const COLLECTIONS_DIR = path.join(__dirname, "..", "collections");
const REPORTS_DIR = path.join(__dirname, "..", "reports");

fs.mkdirSync(COLLECTIONS_DIR, { recursive: true });
fs.mkdirSync(REPORTS_DIR, { recursive: true });

app.use("/reports", express.static(REPORTS_DIR));

app.post("/api/run", async (req, res) => {
  const { epicKey, baseUrl } = req.body as { epicKey?: string; baseUrl?: string };

  if (!epicKey || !baseUrl) {
    return res.status(400).json({ error: "epicKey and baseUrl are both required" });
  }

  const jiraCreds = {
    baseUrl: process.env.JIRA_BASE_URL || "",
    email: process.env.JIRA_EMAIL || "",
    apiToken: process.env.JIRA_API_TOKEN || "",
  };
  const groqKey = process.env.GROQ_API_KEY || "";

  if (!jiraCreds.baseUrl || !jiraCreds.email || !jiraCreds.apiToken) {
    return res.status(500).json({ error: "Server missing Jira credentials. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env." });
  }
  if (!groqKey) {
    return res.status(500).json({ error: "Server missing GROQ_API_KEY in .env." });
  }

  try {
    const acText = await fetchEpicAcs(epicKey, jiraCreds);

    let collectionResult;
    try {
      collectionResult = await generateCollection(acText, baseUrl, { apiKey: groqKey });
    } catch (genErr) {
      const failPath = path.join(COLLECTIONS_DIR, `${epicKey}.failed.txt`);
      fs.writeFileSync(failPath, String((genErr as Error).message));
      return res.status(502).json({
        error: `GROQ did not return valid JSON after retry. Raw output saved to ${failPath}`,
      });
    }

    const collectionPath = path.join(COLLECTIONS_DIR, `${epicKey}.json`);
    fs.writeFileSync(collectionPath, JSON.stringify(collectionResult.collection, null, 2));

    const runResult = await runCollection(collectionPath, epicKey, REPORTS_DIR);

    if (runResult.error) {
      return res.status(502).json({ error: `Newman run failed: ${runResult.error}` });
    }

    const reportUrl = `/reports/${path.basename(runResult.reportDir)}/report.html`;
    return res.json({
      status: runResult.ok ? "pass" : "fail",
      totalRequests: runResult.totalRequests,
      totalFailures: runResult.totalFailures,
      reportUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`api-test-autogen server listening on http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Verify it starts cleanly**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\server"
cp ..\.env.example .env
# edit .env with real JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN/GROQ_API_KEY before Task 6
npm run dev
```
Expected: `api-test-autogen server listening on http://localhost:4000` with no errors. Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
cd "c:\ClaudeCodeMasterclass"
git add api-test-autogen/server/src/index.ts
git commit -m "feat(api-test-autogen): wire Express POST /api/run pipeline"
```

---

### Task 6: Manual smoke test of the full server pipeline (pre-UI validation)

**Purpose:** Validates GROQ→Postman JSON shape and the Newman run path work end-to-end, independent of the React client — matches the spec's "Testing the Tool Itself" section. Do this before building the UI so client bugs and pipeline bugs aren't debugged simultaneously.

**Files:** none created — this is a verification task only.

- [ ] **Step 1: Start the server with real credentials**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\server"
npm run dev
```
Confirm `.env` has a real `GROQ_API_KEY` and real Jira credentials pointing at a project containing at least one Epic with acceptance criteria in its description (e.g. `SCRUM-48` per this workspace's active epics in `CLAUDE.md`).

- [ ] **Step 2: Call the endpoint against a public test API**

In a second terminal:
```bash
curl -X POST http://localhost:4000/api/run \
  -H "Content-Type: application/json" \
  -d '{"epicKey":"SCRUM-48","baseUrl":"https://reqres.in/api"}'
```
Expected: JSON response with `"status": "pass"` or `"status": "fail"` (either is fine — this validates the pipeline runs, not that the generated assertions are perfect), plus `totalRequests`, `totalFailures`, `reportUrl`.

- [ ] **Step 3: Inspect the generated collection**

```bash
cat "c:\ClaudeCodeMasterclass\api-test-autogen\server\collections\SCRUM-48.json"
```
Expected: valid Postman Collection v2.1 JSON — `info.schema` present, `item[]` has at least one request with a `test` event script.

- [ ] **Step 4: Open the report**

```bash
start "http://localhost:4000/api/run"  # (or navigate to the reportUrl from Step 2's response, e.g. http://localhost:4000/reports/SCRUM-48-20260811T.../report.html)
```
Expected: htmlextra HTML report opens in browser showing per-request pass/fail.

- [ ] **Step 5: Test the error path — bad Epic key**

```bash
curl -X POST http://localhost:4000/api/run \
  -H "Content-Type: application/json" \
  -d '{"epicKey":"NOPE-99999","baseUrl":"https://reqres.in/api"}'
```
Expected: non-200 response with a clear `error` field (Jira 404), no crash, no partial collection file written.

- [ ] **Step 6: Note results — no commit needed (verification only)**

If any step fails, fix the relevant source file from Tasks 2-5 and re-run this task from Step 1 before proceeding to Task 7.

---

### Task 7: React client — single-page form + results

**Files:**
- Create: `api-test-autogen/client/package.json`
- Create: `api-test-autogen/client/vite.config.ts`
- Create: `api-test-autogen/client/index.html`
- Create: `api-test-autogen/client/src/main.tsx`
- Create: `api-test-autogen/client/src/App.tsx`
- Create: `api-test-autogen/client/src/App.css`

- [ ] **Step 1: Scaffold the Vite React+TS project**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen"
npm create vite@latest client -- --template react-ts
cd client
npm install
```
Expected: `client/` populated with the standard Vite React-TS template files.

- [ ] **Step 2: Replace `client/vite.config.ts` to proxy API calls to the server**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:4000",
      "/reports": "http://localhost:4000",
    },
  },
});
```

- [ ] **Step 3: Replace `client/src/App.tsx`**

```tsx
import { useState } from "react";
import "./App.css";

type RunStatus = "idle" | "running" | "pass" | "fail" | "error";

interface RunResponse {
  status: "pass" | "fail";
  totalRequests: number;
  totalFailures: number;
  reportUrl: string;
}

function App() {
  const [epicKey, setEpicKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<RunResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    setStatus("running");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epicKey, baseUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Unknown error");
        return;
      }

      setResult(data as RunResponse);
      setStatus(data.status);
    } catch (err) {
      setStatus("error");
      setErrorMsg((err as Error).message);
    }
  }

  return (
    <div className="page">
      <h1>API Test Autogen</h1>
      <p className="subtitle">Jira Epic &rarr; Postman collection &rarr; Newman run &rarr; report</p>

      <form onSubmit={handleRun} className="run-form">
        <label>
          Jira Epic Key
          <input
            value={epicKey}
            onChange={(e) => setEpicKey(e.target.value)}
            placeholder="SCRUM-48"
            required
          />
        </label>
        <label>
          API Base URL
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com"
            required
          />
        </label>
        <button type="submit" disabled={status === "running"}>
          {status === "running" ? "Running..." : "Run"}
        </button>
      </form>

      {status === "running" && <p className="status status-running">Generating collection and running tests&hellip;</p>}

      {status === "error" && (
        <div className="status status-error">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {result && (status === "pass" || status === "fail") && (
        <div className={`status ${status === "pass" ? "status-pass" : "status-fail"}`}>
          <strong>{status === "pass" ? "PASS" : "FAIL"}</strong>
          {" — "}
          {result.totalRequests} requests, {result.totalFailures} failures
          <div>
            <a href={result.reportUrl} target="_blank" rel="noreferrer">
              Open full report
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Replace `client/src/App.css`**

```css
.page {
  max-width: 560px;
  margin: 3rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.run-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.run-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-weight: 600;
}

.run-form input {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.run-form button {
  padding: 0.6rem;
  font-size: 1rem;
  cursor: pointer;
}

.status {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 4px;
}

.status-running {
  background: #eef;
}

.status-pass {
  background: #e6f7e6;
  color: #1a7a1a;
}

.status-fail {
  background: #fdeaea;
  color: #a11;
}

.status-error {
  background: #fdeaea;
  color: #a11;
}
```

- [ ] **Step 5: Start client + server together and verify in browser**

```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\server" && npm run dev
```
In a second terminal:
```bash
cd "c:\ClaudeCodeMasterclass\api-test-autogen\client" && npm run dev
```
Open `http://localhost:5174`. Enter `SCRUM-48` and `https://reqres.in/api`, click Run.
Expected: status changes running → pass/fail, summary line shows request/failure counts, "Open full report" link opens the htmlextra report in a new tab.

- [ ] **Step 6: Commit**

```bash
cd "c:\ClaudeCodeMasterclass"
git add api-test-autogen/client/
git commit -m "feat(api-test-autogen): add React single-page UI"
```

---

### Task 8: Update workspace CLAUDE.md

**Files:**
- Modify: `c:\ClaudeCodeMasterclass\CLAUDE.md`

- [ ] **Step 1: Add project row to the Projects table**

Add this row to the `## Projects` table (after the RAG row):
```
| `api-test-autogen/` | Standalone Jira Epic \u2192 AI-generated Postman collection \u2192 Newman run \u2192 HTML report. Own React+Express, zero shared code with other projects | npm (client + server) |
```

- [ ] **Step 2: Add commands to Critical Commands section**

Add under a new `# api-test-autogen (standalone, no shared code)` heading:
```bash
# api-test-autogen (standalone, no shared code)
cd api-test-autogen/server
npm run dev                    # Express on :4000
cd api-test-autogen/client
npm run dev                    # Vite on :5174, proxies /api and /reports -> :4000
```

- [ ] **Step 3: Add Maintenance Log entry**

Append a row with today's date describing the build (mirrors the pattern of prior entries — origin, what was built, files touched).

- [ ] **Step 4: Commit**

```bash
cd "c:\ClaudeCodeMasterclass"
git add CLAUDE.md
git commit -m "docs: add api-test-autogen to CLAUDE.md"
```

---

## Post-Plan Notes

- **Newman/htmlextra HTML reports** can be large; they are gitignored (`server/reports/`) — do not commit generated reports or collections.
- **`.env` in `api-test-autogen/`** needs its own `JIRA_API_TOKEN` and `GROQ_API_KEY` — these are NOT read from the workspace root `.env` or any other project's `.env` (spec requirement: no shared code/config).
- If GROQ consistently produces schema-invalid Postman JSON for a given Epic, the failed output lands in `server/collections/{EpicKey}.failed.txt` for manual inspection — this is expected behavior per the spec's error handling section, not a bug to silently retry indefinitely.
