// agent-factory-cli · main dispatch

import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { log } from './core/log';
import { runRca } from './rca/rca.agent';
import { runFlaky } from './flaky/flaky.agent';
import { runHeal } from './heal/heal.agent';

const VERSION = require('../package.json').version as string;

const HELP = `agent-factory-cli v${VERSION} — Four AI agents for Playwright (RCA · Flaky · Heal · Triage)

Commands:
  rca    [results.json]                  Root-cause analyse failures.
  flaky  [runsDir]                       Detect flaky tests over N runs.
  heal   [--report p] [--apply] [--pom]  Self-heal a broken locator.
  triage [results.json] [runsDir]        Run all three.
  dashboard [port]                       Serve the dashboard (default :4321).
  help                                   This.
  version                                Print version.

Options:
  --file-bugs              RCA: print Jira draft for product bugs.
  --jira-project KEY       Default Jira project key (env JIRA_PROJECT_KEY).
  --apply                  Heal: write the patch to the Page Object file.
  --pom PATH               Heal: which Page Object to patch.
  --report PATH            Heal: report path (default $PW_REPORT_PATH).

Env vars:
  LLM_MODE       live | mock
  LLM_BASE_URL   default https://api.groq.com/openai/v1
  LLM_API_KEY    your provider key
  LLM_MODEL      e.g. llama-3.3-70b-versatile, deepseek-chat, qwen2.5-coder:7b

More: https://qamasterclass.vercel.app/claudeCodeForQA-Part4`;

interface ParsedArgs {
  cmd: string;
  positional: string[];
  flags: Map<string, string | true>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const cmd = argv[0] ?? 'help';
  const rest = argv.slice(1);
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith('--')) {
        flags.set(key, next);
        i++;
      } else {
        flags.set(key, true);
      }
    } else {
      positional.push(a);
    }
  }
  return { cmd, positional, flags };
}

async function main(): Promise<void> {
  const { cmd, positional, flags } = parseArgs(process.argv.slice(2));

  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(HELP);
    return;
  }
  if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
    console.log(VERSION);
    return;
  }

  const defaultReport = process.env.PW_REPORT_PATH ?? './test-results/results.json';

  try {
    if (cmd === 'rca') {
      const reportPath = positional[0] ?? defaultReport;
      await runRca(reportPath, {
        fileBugs: !!flags.get('file-bugs'),
        jiraProject: (flags.get('jira-project') as string) ?? process.env.JIRA_PROJECT_KEY,
      });
      return;
    }
    if (cmd === 'flaky') {
      const dir = positional[0] ?? './runs';
      await runFlaky(dir);
      return;
    }
    if (cmd === 'heal') {
      const reportPath = (flags.get('report') as string) ?? positional[0] ?? defaultReport;
      await runHeal(reportPath, {
        apply: !!flags.get('apply'),
        pomFile: flags.get('pom') as string | undefined,
      });
      return;
    }
    if (cmd === 'triage') {
      const reportPath = positional[0] ?? defaultReport;
      const runsDir = positional[1] ?? './runs';
      log.header('Triage · RCA → Heal → Flaky');
      const rcaRows = await runRca(reportPath, {
        fileBugs: !!flags.get('file-bugs'),
        jiraProject: (flags.get('jira-project') as string) ?? process.env.JIRA_PROJECT_KEY,
      });
      const hadLocator = rcaRows.some((r) => r.verdict.routeTo === 'heal');
      if (hadLocator) {
        await runHeal(reportPath, {
          apply: !!flags.get('apply'),
          pomFile: flags.get('pom') as string | undefined,
        });
      }
      if (fs.existsSync(runsDir)) {
        await runFlaky(runsDir);
      } else {
        log.info(`Skipping flaky · no run history at ${runsDir}`);
      }
      log.header('Triage done');
      return;
    }
    if (cmd === 'ui' || cmd === 'dashboard') {
      const port = parseInt((positional[0] as string) ?? '4321', 10);
      serveDashboard(port);
      return;
    }
    console.log(`Unknown command: ${cmd}\n\n${HELP}`);
    process.exit(1);
  } catch (e) {
    log.err(String((e as Error).message ?? e));
    process.exit(1);
  }
}

function serveDashboard(port: number): void {
  const uiDir = path.resolve(__dirname, 'dashboard');
  const runsDir = path.resolve(__dirname, '.runs');
  const server = http.createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0];

    // GET /api/runs · latest verdicts written by each agent
    if (url === '/api/runs') {
      const out: Record<string, unknown> = {};
      if (fs.existsSync(runsDir)) {
        for (const f of fs.readdirSync(runsDir).filter((x) => x.endsWith('.json'))) {
          try {
            out[f.replace('.json', '')] = JSON.parse(
              fs.readFileSync(path.join(runsDir, f), 'utf8'),
            );
          } catch {
            /* ignore malformed */
          }
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
      return;
    }

    // POST /run/<agent> · shell out to the matching npm script
    if (url.startsWith('/run/') && req.method === 'POST') {
      const agent = url.slice('/run/'.length);
      const scripts: Record<string, string> = {
        rca: 'ai:rca',
        flaky: 'ai:flaky',
        heal: 'ai:heal',
        triage: 'ai:triage',
      };
      const script = scripts[agent];
      if (!script) {
        res.writeHead(404).end(JSON.stringify({ error: 'unknown agent' }));
        return;
      }
      // Lazy require so the dashboard works without child_process on read-only hosts.
      const { exec } = require('child_process') as typeof import('child_process');
      exec(`npm run ${script}`, { cwd: path.resolve(__dirname, '..') }, (err, stdout, stderr) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: !err, stdout, stderr: stderr || '' }));
      });
      return;
    }

    // Static files from dashboard/
    const filePath =
      url === '/' || url === '/index.html'
        ? path.join(uiDir, 'index.html')
        : path.join(uiDir, url.replace(/^\//, ''));
    if (!filePath.startsWith(uiDir) || !fs.existsSync(filePath)) {
      res.writeHead(404).end('not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
    };
    res.writeHead(200, { 'Content-Type': mime[ext] ?? 'text/plain' });
    res.end(fs.readFileSync(filePath));
  });
  server.listen(port, () => {
    log.ok(`Dashboard · http://localhost:${port}`);
  });
}

main();
