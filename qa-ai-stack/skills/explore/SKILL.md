---
name: explore
description: Explore any URL using Playwright MCP browser — finds all interactive elements (inputs, buttons, links, dropdowns, checkboxes, forms) from live DOM and generates a ready-to-use Playwright TypeScript Page Object Model (POM). Use when user says "/explore [URL]", "explore this page", "find locators for [URL]", or "create POM for [URL]".
improvements: 3
last-improved: 2026-06-25
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

### Step 2: Load Playwright MCP Tools

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

### Step 6: If Multiple Pages/Sections Detected

If page has tabs, modals, or multi-step forms, navigate to each:
```
mcp__playwright__browser_click({ ref: "<tab-ref>" })
mcp__playwright__browser_snapshot({})
```

Capture all states before generating POM.

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
5. `page.locator('#email')` — ID (only if stable)
6. `page.locator('[name="email"]')` — name attribute
7. `page.locator('.btn-primary')` — class (last resort, fragile)

**Never use:** `page.locator('div > span:nth-child(3)')` — fragile, breaks on DOM change.

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
