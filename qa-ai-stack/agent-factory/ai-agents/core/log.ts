// Tiny terminal-friendly logger · no deps

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

export const log = {
  info(msg: string): void {
    console.log(`${DIM}${ts()}${RESET} ${CYAN}info${RESET}  ${msg}`);
  },
  ok(msg: string): void {
    console.log(`${DIM}${ts()}${RESET} ${GREEN}ok${RESET}    ${msg}`);
  },
  warn(msg: string): void {
    console.log(`${DIM}${ts()}${RESET} ${YELLOW}warn${RESET}  ${msg}`);
  },
  err(msg: string): void {
    console.log(`${DIM}${ts()}${RESET} ${RED}err${RESET}   ${msg}`);
  },
  agent(name: string, msg: string): void {
    console.log(`${DIM}${ts()}${RESET} ${MAGENTA}@${name}${RESET} ${msg}`);
  },
  header(msg: string): void {
    console.log('');
    console.log(`${BOLD}${BLUE}━━ ${msg} ━━${RESET}`);
  },
  json(obj: unknown): void {
    console.log(JSON.stringify(obj, null, 2));
  },
};
