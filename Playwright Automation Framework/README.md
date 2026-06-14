# Facebook Playwright Automation Framework

Production-ready Playwright TypeScript framework for Facebook.com automation using Page Object Model (POM) pattern.

## Features

- ✅ **Page Object Model (POM)** - Clean separation of test logic and page elements
- ✅ **Fixture-based Dependency Injection** - Page objects injected into tests automatically
- ✅ **Multi-browser Support** - Chromium, Firefox, WebKit
- ✅ **TypeScript** - Strict typing and better IDE support
- ✅ **Parallel Execution** - Run tests concurrently for faster feedback
- ✅ **Screenshots & Videos** - Captured on failure for debugging
- ✅ **HTML Reports** - Rich test execution reports
- ✅ **Retry Logic** - Auto-retry failed tests

## Project Structure

```
Playwright Automation Framework/
├── src/
│   ├── config/           # Configuration files
│   ├── fixtures/         # Test fixtures (DI setup)
│   │   └── test-fixtures.ts
│   ├── pages/            # Page Object Models
│   │   ├── LoginPage.ts
│   │   ├── RegistrationPage.ts
│   │   └── ForgotPasswordPage.ts
│   ├── utils/            # Helper utilities
│   │   └── helpers.ts
│   └── data/             # Test data
│       └── test-users.ts
├── tests/
│   ├── ui/               # UI test specs
│   │   └── login.spec.ts
│   └── setup/            # Setup scripts
│       └── auth.setup.ts
├── playwright.config.ts  # Playwright configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies and scripts
├── ANTI-HALLUCINATION.md # QA verification rules
└── README.md             # This file
```

## ⚠️ IMPORTANT: Anti-Hallucination Notice

**This framework contains INFERRED locators that are NOT VERIFIED against actual Facebook.**

Before using this framework:

1. **Verify ALL locators:**
   ```bash
   npm run codegen  # Opens Facebook with Playwright Inspector
   ```

2. **Inspect actual DOM** and update locators in:
   - `src/pages/LoginPage.ts`
   - `src/pages/RegistrationPage.ts`
   - `src/pages/ForgotPasswordPage.ts`

3. **Remove TODO comments** after verification

4. **Test against real Facebook** to verify expected behavior

See `ANTI-HALLUCINATION.md` for detailed verification guidelines.

## Setup

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install:browsers
```

### Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

**Note:** Do NOT commit `.env` file with actual credentials.

## Running Tests

```bash
# Run all tests
npm test

# Run UI tests only
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run in debug mode
npm run test:debug

# Run specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Run with tags
npm run test:smoke
npm run test:regression

# Open HTML report
npm run report

# Generate test code (Codegen)
npm run codegen
```

## Test Organization

### Test Tags

- `@smoke` - Critical path tests
- `@regression` - Full regression suite

### Test Categories

1. **Valid Scenarios** - Happy path tests
2. **Invalid Scenarios** - Negative testing
3. **Edge Cases** - Boundary conditions
4. **Security Tests** - SQL injection, XSS, etc.

## Writing Tests

Tests use fixture-based DI. Page objects are automatically injected:

```typescript
import { test, expect } from '../../src/fixtures/test-fixtures';

test('Login test', async ({ loginPage }) => {
  await loginPage.navigate();
  await loginPage.login('email@example.com', 'password');
  await expect(loginPage.page).toHaveURL(/dashboard/);
});
```

## Page Objects

Page objects encapsulate page elements and actions:

```typescript
export class LoginPage {
  constructor(private page: Page) {}
  
  readonly emailInput = this.page.locator('#email');
  readonly passwordInput = this.page.locator('#pass');
  
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

## Configuration

### `playwright.config.ts`

- **Retries:** 1 retry on failure (2 in CI)
- **Screenshots:** On failure only
- **Videos:** Retained on failure
- **Traces:** On first retry
- **Parallel:** Enabled
- **Reporters:** HTML, JSON, List

### TypeScript Paths

Path aliases configured in `tsconfig.json`:

```typescript
import { LoginPage } from '@pages/LoginPage';
import { test } from '@fixtures/test-fixtures';
```

## Best Practices

1. **Locator Priority:**
   - `getByRole` > `getByLabel` > `getByTestId` > CSS/XPath
   
2. **No Hard-coded Waits:**
   - Use `waitFor()`, `waitForLoadState()`, not `setTimeout()`

3. **Independent Tests:**
   - Each test should be runnable in isolation

4. **Test Data:**
   - Use environment variables for credentials
   - Use `test-users.ts` for test data

5. **Error Handling:**
   - Let Playwright's built-in retry handle flakes
   - Add explicit waits only when necessary

6. **Anti-Hallucination Rules:**
   - Follow guidelines in `ANTI-HALLUCINATION.md`
   - Verify locators via Codegen before writing selectors
   - Document assumptions and inferences
   - Never guess expected behavior or error messages
   - Flag uncertain elements with `// TODO: verify` comments

## Troubleshooting

### Tests Failing

```bash
# Run in headed mode to see what's happening
npm run test:headed

# Run in debug mode with inspector
npm run test:debug

# Check HTML report
npm run report
```

### Locator Issues

```bash
# Use codegen to generate locators
npm run codegen
```

### Type Errors

```bash
# Check TypeScript compilation
npm run typecheck
```

## CI/CD Integration

Framework configured for CI with:
- Retries: 2
- Workers: 1 (sequential)
- Screenshots on failure
- Traces on retry

Example GitHub Actions:

```yaml
- name: Install dependencies
  run: npm ci
  
- name: Install Playwright browsers
  run: npm run install:browsers
  
- name: Run tests
  run: npm test
  
- name: Upload report
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Known Limitations

1. **Authentication:** Actual login requires valid Facebook credentials. Auth setup is disabled by default.
2. **Rate Limiting:** Facebook may rate-limit automated requests. Use delays if needed.
3. **CAPTCHA:** Facebook may show CAPTCHA for suspicious activity.

## Contributing

1. Follow existing code structure
2. Add tests for new features
3. Update README for major changes
4. Run `npm run typecheck` before committing

## License

MIT
