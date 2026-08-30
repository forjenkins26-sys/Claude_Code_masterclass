#!/usr/bin/env node
/**
 * QA Pipeline — Local E2E Automation
 *
 * Runs the full 3-skill QA workflow sequentially using Jira MCP + Playwright:
 *   1. /explore  — Playwright DOM snapshot → TypeScript POM
 *   2. /test-case-creation — RICEPOT → Jira test issues under Epic
 *   3. /test-case-execution — Playwright headed run → bug logging
 *
 * Usage:
 *   node qa-pipeline.js SCRUM-194
 *   node qa-pipeline.js SCRUM-194 http://localhost:7000/blinkit-checkout.html
 *
 * Requirements:
 *   - Playwright installed: cd "Playwright Automation Framework" && npm install
 *   - .env in project root with JIRA_URL, JIRA_EMAIL, JIRA_TOKEN, GROQ_KEY
 *   - Run from project root: c:\ClaudeCodeMasterclass\
 */

require('dotenv').config();
const https   = require('https');
const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const { execSync, spawnSync } = require('child_process');

const [,, EPIC_KEY, FEATURE_URL] = process.argv;

if (!EPIC_KEY) {
  console.error('Usage: node qa-pipeline.js <EPIC-KEY> [URL]');
  console.error('Example: node qa-pipeline.js SCRUM-194 http://localhost:7000/blinkit-checkout.html');
  process.exit(1);
}

const CFG = {
  jiraUrl:   process.env.JIRA_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraToken: process.env.JIRA_TOKEN,
  groqKey:   process.env.GROQ_KEY,
};

const LOG_FILE = path.join(__dirname, 'output', `pipeline-${EPIC_KEY}-${Date.now()}.log`);
fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function hr(label) {
  const line = '─'.repeat(60);
  log('');
  log(line);
  log(`  ${label}`);
  log(line);
}

// ─── Jira helpers ─────────────────────────────────────────────
function jiraRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url    = new URL(CFG.jiraUrl);
    const auth   = Buffer.from(`${CFG.jiraEmail}:${CFG.jiraToken}`).toString('base64');
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: url.hostname,
      path: `/rest/api/3${path}`,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function fetchEpic(key) {
  const r = await jiraRequest('GET', `/issue/${key}?fields=summary,description,labels,priority,status,issuetype`);
  if (r.status !== 200) throw new Error(`Jira fetch failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

async function getExistingTestCases(epicKey) {
  const r = await jiraRequest('GET', `/search?jql=parent=${epicKey}+ORDER+BY+key+ASC&fields=summary,key`);
  if (r.status !== 200) return [];
  return r.body.issues || [];
}

// ─── GROQ AI helper ───────────────────────────────────────────
function groqPost(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.3, max_tokens: 4000, messages });
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CFG.groqKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const resp = JSON.parse(data);
          let content = resp.choices[0].message.content.trim();
          content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
          resolve(JSON.parse(content));
        } catch(e) { reject(new Error('GROQ parse error: ' + e.message + '\nRaw: ' + data.slice(0, 500))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── URL fetcher for DOM content ──────────────────────────────
function fetchPageContent(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'QAPipeline/1.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const title = (data.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || url;
        // Extract inputs, buttons, forms
        const inputs   = [...data.matchAll(/<input[^>]*>/gi)].map(m => m[0]).join('\n');
        const buttons  = [...data.matchAll(/<button[^>]*>[\s\S]*?<\/button>/gi)].map(m => m[0]).join('\n');
        const selects  = [...data.matchAll(/<select[^>]*>[\s\S]*?<\/select>/gi)].map(m => m[0]).join('\n');
        const textareas= [...data.matchAll(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi)].map(m => m[0]).join('\n');
        const content  = data.replace(/<script[\s\S]*?<\/script>/gi,'')
          .replace(/<style[\s\S]*?<\/style>/gi,'')
          .replace(/<[^>]+>/g,' ').replace(/\s{3,}/g,'\n').trim().slice(0, 6000);
        resolve({ title, content, inputs, buttons, selects, textareas });
      });
    }).on('error', reject);
  });
}

// ─── STAGE 1: Explore → POM ───────────────────────────────────
async function stageExplore(epic, url) {
  hr('STAGE 1 — /explore: DOM Discovery → TypeScript POM');

  if (!url) {
    // Try to extract URL from Epic description
    const desc = epic.fields?.description?.content?.[0]?.content?.[0]?.text || '';
    const match = desc.match(/https?:\/\/[^\s"'<>]+/);
    url = match ? match[0] : null;
  }

  if (!url) {
    log('⚠️  No URL provided and none found in Epic description.');
    log('   Skipping DOM exploration — provide URL as second argument.');
    log('   Command: node qa-pipeline.js ' + EPIC_KEY + ' http://localhost:7000/your-page.html');
    return { skipped: true };
  }

  log(`Fetching DOM from: ${url}`);
  const page = await fetchPageContent(url);
  log(`Page title: ${page.title}`);
  log(`Inputs found: ${(page.inputs.match(/<input/gi) || []).length}`);
  log(`Buttons found: ${(page.buttons.match(/<button/gi) || []).length}`);

  log('Sending to GROQ → generating TypeScript POM...');
  const pom = await groqPost([
    {
      role: 'system',
      content: `You are a senior QA automation engineer. Generate a Playwright TypeScript Page Object Model.
RULES:
- Use getByRole() + accessible name as first choice
- Use page.locator('#id') for elements with stable IDs
- Group: Form Fields, Buttons, Links, Dropdowns
- Add action methods for main user flows
- Return ONLY valid JSON — no markdown fences.`
    },
    {
      role: 'user',
      content: `Generate a Playwright TypeScript POM for this page.

URL: ${url}
Title: ${page.title}

HTML Inputs:
${page.inputs.slice(0, 3000)}

HTML Buttons:
${page.buttons.slice(0, 2000)}

HTML Selects:
${page.selects.slice(0, 1000)}

Return JSON:
{
  "className": "PascalCasePageName",
  "fileName": "camelCasePage.ts",
  "properties": [
    { "group": "Form Fields|Buttons|Links|Dropdowns", "name": "camelCaseName", "locator": "page.locator('#id') or page.getByRole(...)", "description": "what it is" }
  ],
  "actionMethods": [
    { "name": "methodName", "params": "param1: string, param2: string", "body": "await this.field.fill(param1);\nawait this.btn.click();" }
  ]
}`
    }
  ]);

  // Generate TypeScript file content
  const className = pom.className || 'CheckoutPage';
  const fileName  = pom.fileName  || 'checkoutPage.ts';
  const props     = pom.properties || [];
  const methods   = pom.actionMethods || [];

  const grouped = {};
  props.forEach(p => { (grouped[p.group] = grouped[p.group] || []).push(p); });

  let tsContent = `import { Page, Locator } from '@playwright/test';\n\nexport class ${className} {\n  readonly page: Page;\n\n`;

  Object.entries(grouped).forEach(([group, items]) => {
    tsContent += `  // --- ${group} ---\n`;
    items.forEach(p => { tsContent += `  readonly ${p.name}: Locator;\n`; });
    tsContent += '\n';
  });

  tsContent += `  constructor(page: Page) {\n    this.page = page;\n\n`;
  Object.entries(grouped).forEach(([group, items]) => {
    tsContent += `    // --- ${group} ---\n`;
    items.forEach(p => { tsContent += `    this.${p.name} = ${p.locator};\n`; });
    tsContent += '\n';
  });
  tsContent += `  }\n\n`;

  tsContent += `  async navigate() {\n    await this.page.goto('${url}');\n  }\n\n`;
  methods.forEach(m => {
    tsContent += `  async ${m.name}(${m.params || ''}) {\n`;
    (m.body || '').split('\n').forEach(line => { tsContent += `    ${line}\n`; });
    tsContent += `  }\n\n`;
  });
  tsContent += `}\n`;

  const outPath = path.join(__dirname, 'Playwright Automation Framework', 'src', 'pages', fileName);
  fs.writeFileSync(outPath, tsContent);
  log(`✅ POM saved: ${outPath}`);
  log(`   Class: ${className} | Properties: ${props.length} | Methods: ${methods.length + 1}`);

  return { url, className, fileName, properties: props.length, outPath };
}

// ─── STAGE 2: Test Case Creation (RICEPOT) ────────────────────
async function stageTestCaseCreation(epic, exploreResult) {
  hr('STAGE 2 — /test-case-creation: RICEPOT Framework → Jira');

  const epicKey = epic.key;
  const summary = epic.fields.summary;

  // Flatten ADF description
  function flattenAdf(node) {
    if (!node) return '';
    if (node.type === 'text') return node.text || '';
    if (node.content) return node.content.map(flattenAdf).join(' ');
    return '';
  }
  const description = flattenAdf(epic.fields.description);
  log(`Epic: ${epicKey} — ${summary}`);
  log(`Description length: ${description.length} chars`);

  // Check existing
  const existing = await getExistingTestCases(epicKey);
  if (existing.length > 0) {
    log(`⚠️  Found ${existing.length} existing test cases under ${epicKey}:`);
    existing.forEach(i => log(`   ${i.key}: ${i.fields.summary}`));
    log('Skipping creation — test cases already exist. Delete them first to regenerate.');
    return { skipped: true, existing: existing.map(i => i.key) };
  }

  log('No existing test cases found. Generating with RICEPOT...');

  const context = `Epic Key: ${epicKey}\nSummary: ${summary}\nDescription:\n${description}`;
  const result = await groqPost([
    {
      role: 'system',
      content: `You are a Senior QA Automation Engineer with 15 years experience in requirements-driven testing.

RICEPOT FRAMEWORK — apply every time:
R — ROLE: Never derive expected behavior from UI observation. Assertions come from requirements only.
I — INSTRUCTIONS: Map each requirement/AC line → test scenario. Use exact requirement text as expected results.
C — CONTEXT: Two-source model — Requirements = assertions. UI = locators only.
E — EXAMPLE RIGHT: expectedResult: "Error: Enter your first name (letters only, min 2 chars)" — exact requirement text.
E — EXAMPLE WRONG: expectedResult: "error message appears" — vague, UI-observed. NEVER write this.
P — PARAMETERS: Include security tests (SQL injection, XSS). Flag requirement gaps.
O — OUTPUT: Strict JSON only. Source column traces every assertion to exact requirement line.
T — TONE: Precise. No vague assertions. Every expected result is quotable.

Return ONLY valid JSON — no markdown fences.`
    },
    {
      role: 'user',
      content: `Generate test cases using RICEPOT for this Epic.

${context}

Return JSON:
{
  "testCases": [
    {
      "summary": "TC-001: [concise test name]",
      "type": "Positive|Negative|Edge Case|Security",
      "priority": "High|Medium|Low",
      "source": "AC line N: exact text",
      "preconditions": "string",
      "steps": [
        { "step": 1, "action": "Navigate to / Enter / Click / Verify", "expected": "exact requirement text" }
      ],
      "overallExpected": "exact requirement text — final outcome",
      "testData": "specific values"
    }
  ]
}
Generate at least 8 test cases covering: happy path, all negative scenarios, boundary, edge cases, security (SQL injection + XSS).`
    }
  ]);

  const testCases = result.testCases || [];
  log(`Generated ${testCases.length} test cases. Creating in Jira...`);

  const created = [];
  for (const tc of testCases) {
    const stepsText = (tc.steps || []).map(s => `${s.step}. ${s.action}\n   Expected: ${s.expected}`).join('\n\n');
    const body = {
      fields: {
        project: { key: epicKey.split('-')[0] },
        issuetype: { name: 'Test' },
        summary: tc.summary,
        description: {
          type: 'doc', version: 1,
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: `Source: ${tc.source}`, marks: [{ type: 'strong' }] }] },
            { type: 'paragraph', content: [{ type: 'text', text: `Preconditions: ${tc.preconditions}` }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Test Steps:', marks: [{ type: 'strong' }] }] },
            { type: 'paragraph', content: [{ type: 'text', text: stepsText }] },
            { type: 'paragraph', content: [{ type: 'text', text: `Overall Expected Result: ${tc.overallExpected}`, marks: [{ type: 'strong' }] }] },
            { type: 'paragraph', content: [{ type: 'text', text: `Test Data: ${tc.testData}` }] },
          ]
        },
        priority: { name: tc.priority || 'Medium' },
        parent: { key: epicKey },
        labels: [tc.type?.toLowerCase().replace(' ', '-') || 'functional', 'ricepot', 'auto-generated'],
      }
    };

    const r = await jiraRequest('POST', '/issue', body);
    if (r.status === 201) {
      log(`✅ Created: ${r.body.key} — ${tc.summary}`);
      created.push(r.body.key);
    } else {
      log(`❌ Failed: ${tc.summary} — ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    }

    // Small delay to avoid Jira rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  log(`\n✅ Stage 2 complete: ${created.length}/${testCases.length} test cases created under ${epicKey}`);
  log(`Created keys: ${created.join(', ')}`);
  return { created, total: testCases.length };
}

// ─── STAGE 3: Test Case Execution ─────────────────────────────
async function stageTestExecution(epic, exploreResult, creationResult) {
  hr('STAGE 3 — /test-case-execution: Playwright Headed Run');

  const epicKey = epic.key;

  if (creationResult?.skipped) {
    log(`Using existing test cases: ${(creationResult.existing || []).join(', ')}`);
  } else {
    log(`Running tests for ${creationResult?.created?.length || 0} new test cases under ${epicKey}`);
  }

  const fwPath = path.join(__dirname, 'Playwright Automation Framework');

  // Check if spec file exists for this epic
  const specFiles = fs.readdirSync(path.join(fwPath, 'tests', 'ui')).filter(f => f.endsWith('.spec.ts'));
  log(`Spec files found: ${specFiles.join(', ')}`);

  // Run Playwright tests with epic key grep if possible
  log(`Running: npm run test:headed -- --grep "${epicKey}" (headed mode — AH Rule 17)`);
  log('');
  log('⚠️  NOTE: Full automated execution requires matching spec files in Playwright Automation Framework/tests/ui/');
  log('   If no spec exists for this Epic, create one first using the POM from Stage 1.');
  log('');
  log('   To run manually:');
  log(`   cd "Playwright Automation Framework"`);
  log(`   npm run test:headed -- --grep "${epicKey}"`);
  log('');

  // Try running if spec exists
  const epicSpecMap = {
    'SCRUM-68':  'login.spec.ts',
    'SCRUM-85':  'forgot-password.spec.ts',
    'SCRUM-86':  'registration.spec.ts',
    'SCRUM-121': 'blinkit-login.spec.ts',
  };

  const specFile = epicSpecMap[epicKey];
  if (specFile && fs.existsSync(path.join(fwPath, 'tests', 'ui', specFile))) {
    log(`Found spec: ${specFile} — running now...`);
    const result = spawnSync(
      'npm', ['run', 'test:headed', '--', `--reporter=list`],
      { cwd: fwPath, encoding: 'utf8', timeout: 120000, shell: true }
    );
    log(result.stdout?.slice(0, 3000) || '(no stdout)');
    if (result.stderr) log('STDERR: ' + result.stderr.slice(0, 1000));
    log(`Exit code: ${result.status}`);
  } else {
    log(`No spec file mapped for ${epicKey}. Execution brief generated — run commands above manually.`);
  }

  return { epicKey, status: 'brief-generated' };
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         QA Pipeline — Local E2E Automation               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  log(`Epic: ${EPIC_KEY}`);
  log(`URL: ${FEATURE_URL || '(will extract from Epic or skip)'}`);
  log(`Log: ${LOG_FILE}`);

  // Validate config
  if (!CFG.jiraUrl || !CFG.jiraEmail || !CFG.jiraToken) {
    log('❌ Missing Jira credentials in .env (JIRA_URL, JIRA_EMAIL, JIRA_TOKEN)');
    process.exit(1);
  }
  if (!CFG.groqKey) {
    log('❌ Missing GROQ_KEY in .env');
    process.exit(1);
  }

  hr('Fetching Epic from Jira');
  const epic = await fetchEpic(EPIC_KEY);
  log(`✅ Epic: ${epic.key} — ${epic.fields.summary}`);
  log(`   Status: ${epic.fields.status?.name} | Priority: ${epic.fields.priority?.name}`);

  const exploreResult  = await stageExplore(epic, FEATURE_URL);
  const creationResult = await stageTestCaseCreation(epic, exploreResult);
  const execResult     = await stageTestExecution(epic, exploreResult, creationResult);

  hr('PIPELINE COMPLETE');
  log('');
  log(`✅ Stage 1 — Explore:        ${exploreResult.skipped ? 'SKIPPED (no URL)' : `POM saved → ${exploreResult.fileName}`}`);
  log(`✅ Stage 2 — Test Creation:  ${creationResult.skipped ? `SKIPPED (${creationResult.existing?.length} existing)` : `${creationResult.created?.length} test cases created in Jira`}`);
  log(`✅ Stage 3 — Execution:      ${execResult.status}`);
  log('');
  log(`Full log: ${LOG_FILE}`);
}

main().catch(err => {
  console.error('Pipeline failed:', err.message);
  process.exit(1);
});
