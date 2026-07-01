---
name: explore
description: Explore any URL using Playwright MCP browser — finds all interactive elements (inputs, buttons, links, dropdowns, checkboxes, forms) from live DOM and generates a ready-to-use Playwright TypeScript Page Object Model (POM). Use when user says "/explore [URL]", "explore this page", "find locators for [URL]", or "create POM for [URL]".
improvements: 4
last-improved: 2026-06-27
---

# Explore — Live DOM Locator Discovery & POM Generator

Navigate to any URL using Playwright MCP browser, extract all interactive elements from live DOM snapshot, and output a production-ready Playwright TypeScript Page Object Model.

## Instructions

### Step 1: Parse Input

Extract URL from user input:
- `/explore https://example.com/login` → URL = `https://example.com/login`
- `/explore sdet.live` → URL = `https://sdet.live`
- `/explore localhost:7000/page.html` → URL = `http://localhost:7000/page.html`

If no URL provided, ask: "Which URL should I explore?"

### Step 1.5: Load Known Defects (light KB read — defect-aware POM)

Read ONLY `knowledge-base/<PROJECT>/known-defects.md` if it exists (default `PROJECT=SCRUM`). Hold the defect list (Ref, Area, Symptom) as context.

**Scope guard (two-source model):** explore loads `known-defects.md` ONLY — never `business-rules.md` or Epic ACs. Explore discovers *locators*, not *expected behavior*. Defects are used purely to **annotate** risky locators with a comment, never to write assertions. Assertions remain `/test-case-creation`'s job (Epic = truth).

If the file is missing → continue silently. KB is additive.

```
ToolSearch: select:mcp__playwright__browser_navigate,mcp__playwright__browser_snapshot,mcp__playwright__browser_take_screenshot
```

If Playwright MCP tools not found: fall back to WebFetch for remote URLs, or `node scripts/fetch-local-page.js` for localhost (run from `Playwright Automation Framework/` folder).

### Step 3: Navigate to URL

```
mcp__playwright__browser_navigate({ url: "<URL>" })
```

Wait for page to load. If redirect detected, use final URL.

### Step 4: Take Screenshot (Optional but Recommended)

```
mcp__playwright__browser_take_screenshot({})
```

Captures visual state — useful for verifying what was explored.

### Step 5: Capture Live DOM Snapshot

```
mcp__playwright__browser_snapshot({})
```

Extract from snapshot ALL interactive elements:

**Element types to capture:**

| Type | What to look for in snapshot |
|---|---|
| Text inputs | `textbox`, `input` with placeholder |
| Password inputs | `textbox "Password"` or type=password hint |
| Buttons | `button "Label"` |
| Links (nav/CTA) | `link "Label"` with `/url:` |
| Dropdowns | `combobox`, `listbox`, `option` |
| Checkboxes | `checkbox "Label"` |
| Radio buttons | `radio "Label"` |
| Textareas | `textbox` (multi-line) |
| File uploads | `file` inputs |
| iframes with forms | `iframe` → dig inside for nested elements |

**For each element extract:**
- Role (button, textbox, link, checkbox, combobox, etc.)
- Visible label/name/placeholder
- `ref` id (e.g., `ref=e34`) — maps to DOM element
- `/url:` for links
- `options` for dropdowns

### Step 6: If Multiple SAME-URL States Detected

Capture states that appear **without changing the URL** — tabs, modals,
dropdowns, accordions, multi-step forms that stay on the same route:
```
mcp__playwright__browser_click({ target: "<ref>" })
mcp__playwright__browser_snapshot({})
```

**URL-boundary guard (scope = the explored URL only):** before capturing a
new state, check the URL. If the click **changes the URL** (full nav, SPA
hash-route change like `#/` → `#/cart`, new page), that destination is a
DIFFERENT page — STOP. Do NOT capture it or add its elements to this POM.
It needs its own `/explore` run. An element that merely *links* to another
URL stays IN (the `<a>` lives in this DOM); the *page it leads to* is OUT.

Capture all SAME-URL states before generating POM.

### Step 7: Generate Page Object Model

Generate a TypeScript POM file following this exact structure:

```typescript
import { Page, Locator } from '@playwright/test';

export class PageNamePage {
  readonly page: Page;

  // --- Form Fields ---
  readonly emailInput: Locator;
  readonly passwordInput: Locator;

  // --- Buttons ---
  readonly loginButton: Locator;

  // --- Links ---
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;

  // --- Dropdowns ---
  readonly categoryDropdown: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Form Fields ---
    this.emailInput = page.getByRole('textbox', { name: 'Email Address' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });

    // --- Buttons ---
    this.loginButton = page.getByRole('button', { name: 'Login' });

    // --- Links ---
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot Password?' });
    this.signUpLink = page.getByRole('link', { name: 'Sign Up' });

    // --- Dropdowns ---
    this.categoryDropdown = page.getByRole('combobox');
  }

  // --- Navigation ---
  async navigate() {
    await this.page.goto('<PAGE_URL>');
  }

  // --- Actions ---
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async clickSignUp() {
    await this.signUpLink.click();
  }
}
```

**Naming rules:**
- Class name: PascalCase from page title or URL path (e.g., `LoginPage`, `HomepagePage`, `CheckoutPage`)
- File name: camelCase + `Page.ts` (e.g., `loginPage.ts`, `homepagePage.ts`)
- Property names: camelCase, descriptive, ending in type hint (`Input`, `Button`, `Link`, `Dropdown`, `Checkbox`)
- Action methods: verb + noun (`login()`, `clickForgotPassword()`, `selectCategory()`)

**Locator priority (most stable → least stable):**
1. `getByRole('button', { name: 'Submit' })` — role + accessible name
2. `getByRole('textbox', { name: 'Email Address' })` — role + label
3. `getByPlaceholder('Enter email')` — placeholder
4. `getByLabel('Email')` — label association
5. `getByTestId('submit')` — `data-testid`/`data-*` if present in snapshot
6. `page.locator('#email')` — ID (ONLY if stable — never a generated/dynamic id like `#id-23948`)
7. `page.locator('[name="email"]')` — name attribute

**FORBIDDEN — `rules:check` hard-fails these in `src/pages/*Page.ts` (AH Rule 11 gate):**
- ❌ CSS class: `page.locator('.btn-primary')` — styling changes break it
- ❌ XPath: `page.locator('//div/span[1]')`
- ❌ Positional: `nth-child`, `nth-of-type`, `.nth(3)` — `page.locator('div > span:nth-child(3)')`
- ❌ Dynamic ID: `page.locator('#email-input-2847')`

If the snapshot offers ONLY a fragile hook, emit `getByRole` + `// VERIFICATION REQUIRED` instead — never a forbidden locator. The gate will reject the POM otherwise (adapted from mvsaran Agent-Driven-E2E selector gatekeeper).

**Annotate known-defect locators (from Step 1.5):** if a generated locator maps to an element named in `known-defects.md` (by area/symptom — e.g. a Cancel button on a page with an open status-gating defect), add a comment above that property:

```typescript
// ⚠️ KNOWN DEFECT: SCRUM-269 — Cancel visible in non-cancellable states (BR-08). Test all status states.
readonly cancelOrderButton: Locator;
```

This is a **comment only** — no assertion, no behavior change. It surfaces risk to the human + the downstream `/test-case-creation` run. Never invent a defect link; only annotate when the element clearly matches a `known-defects.md` row.

### Step 8: Output

Output in this order:

1. **Summary table** — all elements found
2. **Generated POM file** — complete TypeScript code block
3. **File save path suggestion** — where to save in project

**Summary table format:**

```
## Elements Found on [URL]

| Element | Type | Locator Strategy | Notes |
|---|---|---|---|
| Email Address | textbox | getByRole('textbox', { name: 'Email Address' }) | Login form |
| Password | textbox | getByRole('textbox', { name: 'Password' }) | Has show/hide toggle |
| Login | button | getByRole('button', { name: 'Login' }) | Submit action |
| Forgot Password? | link | getByRole('link', { name: 'Forgot Password?' }) | href: /password/reset |
| Sign Up | link | getByRole('link', { name: 'Sign Up' }) | href: /register |
| I'm not a robot | checkbox | frameLocator('iframe').getByRole('checkbox', ...) | reCAPTCHA — needs bypass in tests |
```

**Special notes to always flag:**
- reCAPTCHA / CAPTCHA detected → flag as "needs test bypass"
- iframes with forms → flag as "requires frameLocator()"
- Dynamically loaded content → flag as "may need waitFor()"
- Password show/hide toggles → document separately

### Step 9: Ask to Save

After outputting POM, ask:

> "Should I save this POM to the Playwright Automation Framework?
> Suggested path: `Playwright Automation Framework/src/pages/<filename>.ts`
> Reply **yes** to save, or provide a custom path."

If yes → Write file using the Write tool.

After saving, append to `C:\ClaudeCodeMasterclass\rca-log.md` (BLAST protocol):

```markdown
## {YYYY-MM-DD} — /explore {URL}

**POM Generated:** `Playwright Automation Framework/src/pages/{filename}.ts`
**Elements Found:** {N} total ({inputs} inputs, {buttons} buttons, {links} links)
**Locators Verified:** {N} confirmed from snapshot | {N} marked VERIFICATION REQUIRED
**Notes:** {reCAPTCHA detected / iframes present / dynamic content flagged — or "none"}
```

Do NOT overwrite — always append.

## Anti-patterns

❌ **Don't:**
- Use index-based locators (`nth(3)`) — breaks on DOM change
- Use text-based locators on Facebook/multilingual pages — locale changes break them
- Include every `generic [ref=eXX]` container div — only interactive elements
- Invent locators not found in snapshot — only use what DOM confirms
- Skip iframe content — always dig inside iframes for nested forms

✅ **Do:**
- Use `getByRole` + accessible name as first choice
- Group properties in constructor by type (Fields, Buttons, Links, Dropdowns)
- Add comment per group (`// --- Form Fields ---`)
- Flag reCAPTCHA, iframes, and dynamic content in notes
- Generate action methods for the main user flows (login, search, submit)

❌ **Don't:** Skip Playwright MCP check — fall back to WebFetch only if MCP tools genuinely unavailable
✅ **Do:** Always ToolSearch for Playwright MCP first. MCP gives live DOM, real selectors, screenshots. WebFetch is last resort.
*(Lesson #1 — 2026-06-14)*

❌ **Don't:** Generate `data-test` locators from convention/memory — accessibility snapshot doesn't expose data-test attrs
✅ **Do:** Only use locators visible in snapshot output. If attribute not confirmed, use role-based locator + add `// VERIFICATION REQUIRED` comment.
*(Lesson #2 — 2026-06-14)*

❌ **Don't:** Use bare `getByText('X')` for labels that may appear in multiple page sections (date strings, headers, status badges, timeline labels)
✅ **Do:** Scope to parent container + `{ exact: true }`: `page.locator('.timeline').getByText('Placed', { exact: true })`. Prevents strict mode violations at test runtime.
*(Lesson #3 — 2026-06-25)*

❌ **Don't:** Load `business-rules.md` or Epic ACs into explore, or write assertions from defects — that breaks the two-source model (explore = locators only)
✅ **Do:** Load `known-defects.md` ONLY (Step 1.5), and use it purely to add `// ⚠️ KNOWN DEFECT` comments on matching locators. Comment only — never an assertion. Assertions stay in `/test-case-creation`.
*(Lesson #4 — 2026-06-27)*

❌ **Don't:** Silently filter out links that leave the page or go to another domain (external links, "Flight Booking", recruiter banners). "ALL interactive elements" means ALL — deciding what's worth keeping is scope creep (AH Rule 26).
✅ **Do:** Include every `link` with a `/url:` from the snapshot. Tag off-domain ones with an `// EXTERNAL → <domain>` comment so tests know clicking leaves the app. Capture, then annotate — never drop.
*(Lesson #5 — 2026-06-29)*

❌ **Don't:** Navigate past the explored URL into a different page and pull its elements into this POM. Clicking PROCEED TO CHECKOUT (`#/` → `#/cart`) then adding the checkout table/promo/Place Order to the landing-page POM mixes two pages. URL change = scope boundary (AH Rule 26 + Step 6 guard).
✅ **Do:** Explore exactly the URL given. Capture same-URL states (dropdowns, modals, tabs that don't change the route). The moment a click changes the URL, STOP — that page is a separate `/explore`. A link *element* to another page stays IN; the *destination page* is OUT.
*(Lesson #6 — 2026-06-29)*
