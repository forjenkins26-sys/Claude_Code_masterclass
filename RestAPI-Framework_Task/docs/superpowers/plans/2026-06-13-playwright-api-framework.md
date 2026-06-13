# Playwright API Testing Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready 6-layer Playwright APIRequestContext + TypeScript API testing framework targeting Restful Booker, isolated in `RestAPI-Framework_Task/`.

**Architecture:** 6 layers — Config → Types → Clients → Services → Utils → Tests. Clients make raw API calls only. Services own business logic and multi-step flows. DI fixture injects all layers into tests.

**Tech Stack:** TypeScript, @playwright/test, @faker-js/faker, Node.js

---

## File Map

| File | Layer | Responsibility |
|---|---|---|
| `package.json` | — | Dependencies + npm scripts |
| `tsconfig.json` | — | TypeScript compiler config |
| `playwright.config.ts` | — | baseURL, reporter, timeout, project |
| `src/01_config/config.ts` | 01 | baseURL, credentials, timeout constants |
| `src/02_types/auth.types.ts` | 02 | AuthRequest, AuthResponse interfaces |
| `src/02_types/booking.types.ts` | 02 | BookingRequest, BookingResponse, BookingDates, BookingId interfaces |
| `src/03_clients/auth.client.ts` | 03 | POST /auth → raw APIResponse |
| `src/03_clients/booking.client.ts` | 03 | All /booking endpoints → raw APIResponse |
| `src/04_services/auth.service.ts` | 04 | getToken() with caching |
| `src/04_services/booking.service.ts` | 04 | createAndVerify, updateAndVerify, deleteAndVerify |
| `src/05_utils/date-utils.ts` | 05 | futureDate(), today() |
| `src/05_utils/data-factory.ts` | 05 | buildBookingRequest(), buildAuthRequest() |
| `src/fixtures/api-fixtures.ts` | DI | Extends test with injected clients + services |
| `tests/auth.spec.ts` | 06 | 2 auth tests |
| `tests/booking.spec.ts` | 06 | 7 booking CRUD tests |
| `tests/filter.spec.ts` | 06 | 4 filter tests |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `playwright.config.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "restapi-framework-task",
  "version": "1.0.0",
  "description": "Playwright API Testing Framework — Restful Booker",
  "scripts": {
    "test": "npx playwright test",
    "test:auth": "npx playwright test tests/auth.spec.ts",
    "test:booking": "npx playwright test tests/booking.spec.ts",
    "test:filter": "npx playwright test tests/filter.spec.ts",
    "report": "npx playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.0",
    "@faker-js/faker": "^8.4.1",
    "typescript": "^5.4.5",
    "@types/node": "^20.12.12"
  }
}
```

Save to: `RestAPI-Framework_Task/package.json`

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./",
    "baseUrl": ".",
    "paths": {
      "@config": ["src/01_config/config"],
      "@types/*": ["src/02_types/*"],
      "@clients/*": ["src/03_clients/*"],
      "@services/*": ["src/04_services/*"],
      "@utils/*": ["src/05_utils/*"],
      "@fixtures": ["src/fixtures/api-fixtures"]
    }
  },
  "include": ["src/**/*", "tests/**/*", "playwright.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Save to: `RestAPI-Framework_Task/tsconfig.json`

- [ ] **Step 3: Create playwright.config.ts**

```typescript
import { defineConfig } from '@playwright/test';
import { config } from './src/01_config/config';

export default defineConfig({
  testDir: './tests',
  timeout: config.timeout,
  use: {
    baseURL: config.baseURL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  projects: [
    { name: 'api-tests' }
  ]
});
```

Save to: `RestAPI-Framework_Task/playwright.config.ts`

- [ ] **Step 4: Install dependencies**

```bash
cd "c:\ClaudeCodeMasterclass\RestAPI-Framework_Task"
npm install
```

Expected: `node_modules/` created, no errors

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json playwright.config.ts
git commit -m "feat: scaffold Playwright API framework — package.json, tsconfig, playwright.config"
```

---

## Task 2: Layer 01 — Config

**Files:**
- Create: `src/01_config/config.ts`

- [ ] **Step 1: Create config.ts**

```typescript
export const config = {
  baseURL: 'https://restful-booker.herokuapp.com',
  auth: {
    username: 'admin',
    password: 'password123'
  },
  timeout: 10000
} as const;
```

Save to: `src/01_config/config.ts`

- [ ] **Step 2: Commit**

```bash
git add src/01_config/
git commit -m "feat: add layer 01 config — baseURL, credentials, timeout"
```

---

## Task 3: Layer 02 — Types

**Files:**
- Create: `src/02_types/auth.types.ts`
- Create: `src/02_types/booking.types.ts`

- [ ] **Step 1: Create auth.types.ts**

```typescript
export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}
```

Save to: `src/02_types/auth.types.ts`

- [ ] **Step 2: Create booking.types.ts**

```typescript
export interface BookingDates {
  checkin: string;
  checkout: string;
}

export interface BookingRequest {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds: string;
}

export interface BookingResponse {
  bookingid: number;
  booking: BookingRequest;
}

export interface BookingId {
  bookingid: number;
}
```

Save to: `src/02_types/booking.types.ts`

- [ ] **Step 3: Commit**

```bash
git add src/02_types/
git commit -m "feat: add layer 02 types — AuthRequest/Response, BookingRequest/Response/Dates/Id interfaces"
```

---

## Task 4: Layer 05 — Utils

**Files:**
- Create: `src/05_utils/date-utils.ts`
- Create: `src/05_utils/data-factory.ts`

- [ ] **Step 1: Create date-utils.ts**

```typescript
export function futureDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}
```

Save to: `src/05_utils/date-utils.ts`

- [ ] **Step 2: Create data-factory.ts**

```typescript
import { faker } from '@faker-js/faker';
import { config } from '../01_config/config';
import { AuthRequest } from '../02_types/auth.types';
import { BookingRequest } from '../02_types/booking.types';
import { futureDate } from './date-utils';

export function buildBookingRequest(): BookingRequest {
  return {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    totalprice: faker.number.int({ min: 50, max: 500 }),
    depositpaid: true,
    bookingdates: {
      checkin: futureDate(5),
      checkout: futureDate(10)
    },
    additionalneeds: 'Breakfast'
  };
}

export function buildAuthRequest(): AuthRequest {
  return {
    username: config.auth.username,
    password: config.auth.password
  };
}
```

Save to: `src/05_utils/data-factory.ts`

- [ ] **Step 3: Commit**

```bash
git add src/05_utils/
git commit -m "feat: add layer 05 utils — DateUtils (futureDate, today), DataFactory (buildBookingRequest, buildAuthRequest)"
```

---

## Task 5: Layer 03 — Clients

**Files:**
- Create: `src/03_clients/auth.client.ts`
- Create: `src/03_clients/booking.client.ts`

- [ ] **Step 1: Create auth.client.ts**

```typescript
import { APIRequestContext, APIResponse } from '@playwright/test';
import { AuthRequest } from '../02_types/auth.types';

export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async createToken(body: AuthRequest): Promise<APIResponse> {
    return this.request.post('/auth', { data: body });
  }
}
```

Save to: `src/03_clients/auth.client.ts`

- [ ] **Step 2: Create booking.client.ts**

```typescript
import { APIRequestContext, APIResponse } from '@playwright/test';
import { BookingRequest } from '../02_types/booking.types';

export class BookingClient {
  constructor(private readonly request: APIRequestContext) {}

  async getAllBookings(): Promise<APIResponse> {
    return this.request.get('/booking');
  }

  async getBookingById(id: number): Promise<APIResponse> {
    return this.request.get(`/booking/${id}`);
  }

  async createBooking(body: BookingRequest): Promise<APIResponse> {
    return this.request.post('/booking', { data: body });
  }

  async updateBooking(id: number, body: BookingRequest, token: string): Promise<APIResponse> {
    return this.request.put(`/booking/${id}`, {
      data: body,
      headers: { 'Cookie': `token=${token}` }
    });
  }

  async partialUpdateBooking(id: number, fields: Partial<BookingRequest>, token: string): Promise<APIResponse> {
    return this.request.patch(`/booking/${id}`, {
      data: fields,
      headers: { 'Cookie': `token=${token}` }
    });
  }

  async deleteBooking(id: number, token: string): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`, {
      headers: { 'Cookie': `token=${token}` }
    });
  }

  async deleteBookingNoToken(id: number): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`);
  }

  async getBookingsByFilter(params: Record<string, string>): Promise<APIResponse> {
    return this.request.get('/booking', { params });
  }
}
```

Save to: `src/03_clients/booking.client.ts`

- [ ] **Step 3: Commit**

```bash
git add src/03_clients/
git commit -m "feat: add layer 03 clients — AuthClient (POST /auth), BookingClient (all /booking endpoints, raw APIResponse)"
```

---

## Task 6: Layer 04 — Services

**Files:**
- Create: `src/04_services/auth.service.ts`
- Create: `src/04_services/booking.service.ts`

- [ ] **Step 1: Create auth.service.ts**

```typescript
import { expect } from '@playwright/test';
import { AuthClient } from '../03_clients/auth.client';
import { buildAuthRequest } from '../05_utils/data-factory';

export class AuthService {
  private cachedToken: string | null = null;

  constructor(private readonly authClient: AuthClient) {}

  async getToken(): Promise<string> {
    if (this.cachedToken) return this.cachedToken;

    const response = await this.authClient.createToken(buildAuthRequest());
    expect(response.status()).toBe(200);

    const body = await response.json();
    if (!body.token || body.token === 'Bad credentials') {
      throw new Error(`Failed to obtain auth token. Response: ${JSON.stringify(body)}`);
    }

    this.cachedToken = body.token as string;
    return this.cachedToken;
  }

  clearToken(): void {
    this.cachedToken = null;
  }
}
```

Save to: `src/04_services/auth.service.ts`

- [ ] **Step 2: Create booking.service.ts**

```typescript
import { expect } from '@playwright/test';
import { BookingClient } from '../03_clients/booking.client';
import { BookingRequest, BookingResponse } from '../02_types/booking.types';

export class BookingService {
  constructor(private readonly bookingClient: BookingClient) {}

  async createAndVerify(request: BookingRequest): Promise<BookingResponse> {
    const createResponse = await this.bookingClient.createBooking(request);
    expect(createResponse.status()).toBe(200);

    const created: BookingResponse = await createResponse.json();
    expect(created.bookingid).toBeTruthy();

    const getResponse = await this.bookingClient.getBookingById(created.bookingid);
    expect(getResponse.status()).toBe(200);

    const fetched: BookingRequest = await getResponse.json();
    expect(fetched.firstname).toBe(request.firstname);
    expect(fetched.lastname).toBe(request.lastname);
    expect(fetched.totalprice).toBe(request.totalprice);

    return created;
  }

  async updateAndVerify(id: number, updatedRequest: BookingRequest, token: string): Promise<void> {
    const updateResponse = await this.bookingClient.updateBooking(id, updatedRequest, token);
    expect(updateResponse.status()).toBe(200);

    const getResponse = await this.bookingClient.getBookingById(id);
    expect(getResponse.status()).toBe(200);

    const fetched: BookingRequest = await getResponse.json();
    expect(fetched.firstname).toBe(updatedRequest.firstname);
    expect(fetched.totalprice).toBe(updatedRequest.totalprice);
  }

  async deleteAndVerify(id: number, token: string): Promise<void> {
    const deleteResponse = await this.bookingClient.deleteBooking(id, token);
    // Restful Booker returns 201 on successful delete (quirk)
    expect(deleteResponse.status()).toBe(201);

    const getResponse = await this.bookingClient.getBookingById(id);
    expect(getResponse.status()).toBe(404);
  }
}
```

Save to: `src/04_services/booking.service.ts`

- [ ] **Step 3: Commit**

```bash
git add src/04_services/
git commit -m "feat: add layer 04 services — AuthService (cached token), BookingService (createAndVerify, updateAndVerify, deleteAndVerify)"
```

---

## Task 7: DI Fixtures

**Files:**
- Create: `src/fixtures/api-fixtures.ts`

- [ ] **Step 1: Create api-fixtures.ts**

```typescript
import { test as base, APIRequestContext } from '@playwright/test';
import { AuthClient } from '../03_clients/auth.client';
import { BookingClient } from '../03_clients/booking.client';
import { AuthService } from '../04_services/auth.service';
import { BookingService } from '../04_services/booking.service';

type ApiFixtures = {
  authClient: AuthClient;
  bookingClient: BookingClient;
  authService: AuthService;
  bookingService: BookingService;
};

export const test = base.extend<ApiFixtures>({
  authClient: async ({ request }, use) => {
    await use(new AuthClient(request));
  },

  bookingClient: async ({ request }, use) => {
    await use(new BookingClient(request));
  },

  authService: async ({ request }, use) => {
    const client = new AuthClient(request);
    await use(new AuthService(client));
  },

  bookingService: async ({ request }, use) => {
    const client = new BookingClient(request);
    await use(new BookingService(client));
  }
});

export { expect } from '@playwright/test';
```

Save to: `src/fixtures/api-fixtures.ts`

- [ ] **Step 2: Commit**

```bash
git add src/fixtures/
git commit -m "feat: add DI fixture — injects authClient, bookingClient, authService, bookingService into tests"
```

---

## Task 8: Tests — auth.spec.ts

**Files:**
- Create: `tests/auth.spec.ts`

- [ ] **Step 1: Create auth.spec.ts**

```typescript
import { test, expect } from '../src/fixtures/api-fixtures';

test.describe('Authentication', () => {

  test('verify token generated with valid credentials', async ({ authService }) => {
    const token = await authService.getToken();
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(0);
  });

  test('verify bad credentials returns "Bad credentials" body', async ({ authClient }) => {
    const response = await authClient.createToken({
      username: 'wronguser',
      password: 'wrongpassword'
    });
    // Restful Booker returns 200 even for bad creds — must check body
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.token).toBe('Bad credentials');
  });

});
```

Save to: `tests/auth.spec.ts`

- [ ] **Step 2: Run auth tests**

```bash
cd "c:\ClaudeCodeMasterclass\RestAPI-Framework_Task"
npx playwright test tests/auth.spec.ts --reporter=list
```

Expected: `2 passed`

- [ ] **Step 3: Commit**

```bash
git add tests/auth.spec.ts
git commit -m "feat: add auth.spec.ts — 2 tests (valid token, bad credentials)"
```

---

## Task 9: Tests — booking.spec.ts

**Files:**
- Create: `tests/booking.spec.ts`

- [ ] **Step 1: Create booking.spec.ts**

```typescript
import { test, expect } from '../src/fixtures/api-fixtures';
import { buildBookingRequest } from '../src/05_utils/data-factory';
import { BookingRequest } from '../src/02_types/booking.types';

test.describe('Booking CRUD', () => {

  test('verify GET all bookings returns non-empty list', async ({ bookingClient }) => {
    const response = await bookingClient.getAllBookings();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  test('verify POST create booking returns created data', async ({ bookingService }) => {
    const request = buildBookingRequest();
    const created = await bookingService.createAndVerify(request);
    expect(created.bookingid).toBeGreaterThan(0);
  });

  test('verify GET booking by ID returns correct data', async ({ bookingService, bookingClient }) => {
    const request = buildBookingRequest();
    const created = await bookingService.createAndVerify(request);

    const response = await bookingClient.getBookingById(created.bookingid);
    expect(response.status()).toBe(200);
    const fetched: BookingRequest = await response.json();
    expect(fetched.firstname).toBe(request.firstname);
    expect(fetched.lastname).toBe(request.lastname);
  });

  test('verify PUT update booking reflects changes in GET', async ({ bookingService, authService }) => {
    const original = buildBookingRequest();
    const created = await bookingService.createAndVerify(original);
    const token = await authService.getToken();

    const updated = buildBookingRequest();
    await bookingService.updateAndVerify(created.bookingid, updated, token);
  });

  test('verify PATCH partial update changes only specified field', async ({ bookingService, bookingClient, authService }) => {
    const request = buildBookingRequest();
    const created = await bookingService.createAndVerify(request);
    const token = await authService.getToken();

    const getBeforePatch = await bookingClient.getBookingById(created.bookingid);
    const before: BookingRequest = await getBeforePatch.json();
    const originalLastname = before.lastname;

    const patchResponse = await bookingClient.partialUpdateBooking(
      created.bookingid,
      { firstname: 'PatchedName' },
      token
    );
    expect(patchResponse.status()).toBe(200);

    const getAfterPatch = await bookingClient.getBookingById(created.bookingid);
    const after: BookingRequest = await getAfterPatch.json();
    expect(after.firstname).toBe('PatchedName');
    expect(after.lastname).toBe(originalLastname);
  });

  test('verify DELETE without token returns 403', async ({ bookingService, bookingClient }) => {
    const request = buildBookingRequest();
    const created = await bookingService.createAndVerify(request);

    const response = await bookingClient.deleteBookingNoToken(created.bookingid);
    expect(response.status()).toBe(403);
  });

  test('verify DELETE with valid token returns 201 and GET returns 404', async ({ bookingService, authService }) => {
    const request = buildBookingRequest();
    const created = await bookingService.createAndVerify(request);
    const token = await authService.getToken();

    await bookingService.deleteAndVerify(created.bookingid, token);
  });

});
```

Save to: `tests/booking.spec.ts`

- [ ] **Step 2: Run booking tests**

```bash
npx playwright test tests/booking.spec.ts --reporter=list
```

Expected: `7 passed`

- [ ] **Step 3: Commit**

```bash
git add tests/booking.spec.ts
git commit -m "feat: add booking.spec.ts — 7 CRUD tests (GET all, GET by ID, POST, PUT, PATCH, DELETE with/without token)"
```

---

## Task 10: Tests — filter.spec.ts

**Files:**
- Create: `tests/filter.spec.ts`

- [ ] **Step 1: Create filter.spec.ts**

```typescript
import { test, expect } from '../src/fixtures/api-fixtures';
import { buildBookingRequest } from '../src/05_utils/data-factory';
import { futureDate } from '../src/05_utils/date-utils';
import { BookingId } from '../src/02_types/booking.types';

test.describe('Booking Filters', () => {

  test('verify filter by firstname returns matching bookings', async ({ bookingService, bookingClient }) => {
    const request = buildBookingRequest();
    request.firstname = 'FilterTestUser';
    await bookingService.createAndVerify(request);

    const response = await bookingClient.getBookingsByFilter({ firstname: 'FilterTestUser' });
    expect(response.status()).toBe(200);
    const body: BookingId[] = await response.json();
    expect(body.length).toBeGreaterThan(0);
  });

  test('verify filter by lastname returns matching bookings', async ({ bookingService, bookingClient }) => {
    const request = buildBookingRequest();
    request.lastname = 'AutomationSeed';
    await bookingService.createAndVerify(request);

    const response = await bookingClient.getBookingsByFilter({ lastname: 'AutomationSeed' });
    expect(response.status()).toBe(200);
    const body: BookingId[] = await response.json();
    expect(body.length).toBeGreaterThan(0);
  });

  test('verify filter by checkin date returns 200', async ({ bookingClient }) => {
    const response = await bookingClient.getBookingsByFilter({
      checkin: futureDate(1)
    });
    expect(response.status()).toBe(200);
  });

  test('verify filter by non-existent name returns empty list or 404', async ({ bookingClient }) => {
    const response = await bookingClient.getBookingsByFilter({
      firstname: 'ZZZNonExistentUser99999'
    });
    const status = response.status();
    if (status === 200) {
      const body: BookingId[] = await response.json();
      expect(body.length).toBe(0);
    } else {
      expect(status).toBe(404);
    }
  });

});
```

Save to: `tests/filter.spec.ts`

- [ ] **Step 2: Run filter tests**

```bash
npx playwright test tests/filter.spec.ts --reporter=list
```

Expected: `4 passed`

- [ ] **Step 3: Commit**

```bash
git add tests/filter.spec.ts
git commit -m "feat: add filter.spec.ts — 4 filter tests (firstname, lastname, checkin, non-existent)"
```

---

## Task 11: Full Suite Run + HTML Report

- [ ] **Step 1: Run full suite**

```bash
cd "c:\ClaudeCodeMasterclass\RestAPI-Framework_Task"
npx playwright test --reporter=list
```

Expected: `13 passed`

- [ ] **Step 2: Open HTML report**

```bash
npx playwright show-report
```

Expected: Browser opens with 13 tests grouped by describe block (Authentication, Booking CRUD, Booking Filters)

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: Playwright API framework complete — 13 tests, 6-layer architecture, Restful Booker, RICEPOT aligned"
```

---

## Self-Review

**Spec coverage:**
- ✅ 01_config — config.ts (Task 2)
- ✅ 02_types — auth.types.ts, booking.types.ts (Task 3)
- ✅ 03_clients — auth.client.ts, booking.client.ts (Task 5)
- ✅ 04_services — auth.service.ts, booking.service.ts (Task 6)
- ✅ 05_utils — date-utils.ts, data-factory.ts (Task 4)
- ✅ fixtures — api-fixtures.ts DI (Task 7)
- ✅ auth.spec.ts — 2 tests (Task 8)
- ✅ booking.spec.ts — 7 tests (Task 9)
- ✅ filter.spec.ts — 4 tests (Task 10)
- ✅ DELETE → 201 quirk documented in deleteAndVerify comment
- ✅ Bad credentials → body.token === 'Bad credentials' check (not status check)
- ✅ Cookie token auth: `Cookie: token=${token}` (not Bearer)
- ✅ No assertions in clients — raw APIResponse only

**Placeholder scan:** None. All steps have complete code.

**Type consistency:**
- `AuthClient.createToken(AuthRequest)` → used in AuthService ✅
- `BookingClient.getAllBookings()` → used in booking.spec.ts ✅
- `BookingService.createAndVerify(BookingRequest)` → returns `BookingResponse` → used in booking.spec.ts, filter.spec.ts ✅
- `BookingService.deleteAndVerify(number, string)` → used in booking.spec.ts ✅
- `buildBookingRequest()` → returns `BookingRequest` → used in booking.spec.ts, filter.spec.ts ✅
- `futureDate(number)` → used in data-factory.ts, filter.spec.ts ✅
- `test` imported from `api-fixtures.ts` in all spec files ✅
