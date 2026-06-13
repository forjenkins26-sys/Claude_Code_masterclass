# Playwright API Testing Framework — Design Spec

**Date:** 2026-06-13
**Author:** Anand Soni
**Target API:** Restful Booker (`https://restful-booker.herokuapp.com`)
**Framework:** Playwright APIRequestContext + TypeScript + @playwright/test
**Architecture:** 6-layer (mirrors Playwright_8_Layer pattern)

---

## RICEPOT Alignment

| Letter | Framework Element |
|---|---|
| R — Role | `04_services/` — orchestrates business flows, owns preconditions |
| I — Instructions | `03_clients/` — raw API calls via APIRequestContext, no assertions |
| C — Context | `01_config/` — env config, base URL, credentials, timeouts |
| E — Example | `02_types/` — TypeScript interfaces define exact request/response shape |
| P — Parameters | `05_utils/` — DataFactory, DateUtils — constraints + test data |
| O — Output | Playwright HTML report + JSON reporter — auto-captures request/response |
| T — Tone | `06_tests/` — terse, readable test blocks, assertions on outcomes not mechanics |

---

## Folder Structure

```
RestAPI-Framework_Task/
├── src/
│   ├── 01_config/
│   │   └── config.ts               ← env vars, baseURL, credentials
│   ├── 02_types/
│   │   ├── auth.types.ts           ← AuthRequest, AuthResponse interfaces
│   │   └── booking.types.ts        ← BookingRequest, BookingResponse, BookingDates interfaces
│   ├── 03_clients/
│   │   ├── auth.client.ts          ← POST /auth → raw APIResponse
│   │   └── booking.client.ts       ← all /booking endpoints → raw APIResponse
│   ├── 04_services/
│   │   ├── auth.service.ts         ← getToken(), caches token per suite
│   │   └── booking.service.ts      ← createAndVerify, updateAndVerify, deleteAndVerify
│   ├── 05_utils/
│   │   ├── data-factory.ts         ← Faker-based BookingRequest + AuthRequest builders
│   │   └── date-utils.ts           ← futureDate(daysAhead), today()
│   └── fixtures/
│       └── api-fixtures.ts         ← DI fixture — injects clients + services into tests
├── tests/
│   ├── auth.spec.ts                ← 2 auth test cases
│   ├── booking.spec.ts             ← 7 booking CRUD test cases
│   └── filter.spec.ts              ← 4 filter test cases
├── playwright.config.ts            ← baseURL, reporter, project config
├── package.json
└── tsconfig.json
```

---

## Layer Specifications

### 01_config — config.ts

```typescript
export const config = {
  baseURL: 'https://restful-booker.herokuapp.com',
  auth: {
    username: 'admin',
    password: 'password123'
  },
  timeout: 10000
};
```

### 02_types — TypeScript Interfaces

**auth.types.ts:**
```typescript
export interface AuthRequest { username: string; password: string; }
export interface AuthResponse { token: string; }
```

**booking.types.ts:**
```typescript
export interface BookingDates { checkin: string; checkout: string; }
export interface BookingRequest {
  firstname: string; lastname: string;
  totalprice: number; depositpaid: boolean;
  bookingdates: BookingDates; additionalneeds: string;
}
export interface BookingResponse { bookingid: number; booking: BookingRequest; }
export interface BookingId { bookingid: number; }
```

### 03_clients — Raw API Layer

- `AuthClient.createToken(request: AuthRequest)` → `Promise<APIResponse>`
- `BookingClient.getAllBookings()` → `Promise<APIResponse>`
- `BookingClient.getBookingById(id: number)` → `Promise<APIResponse>`
- `BookingClient.createBooking(request: BookingRequest)` → `Promise<APIResponse>`
- `BookingClient.updateBooking(id, request, token)` → `Promise<APIResponse>`
- `BookingClient.partialUpdateBooking(id, fields, token)` → `Promise<APIResponse>`
- `BookingClient.deleteBooking(id, token)` → `Promise<APIResponse>`
- `BookingClient.deleteBookingNoToken(id)` → `Promise<APIResponse>`
- `BookingClient.getBookingsByFilter(params)` → `Promise<APIResponse>`

**Rule:** No assertions in clients. Return raw `APIResponse` only.

### 04_services — Business Logic Layer

- `AuthService.getToken()` — calls AuthClient, caches token, throws if token missing
- `BookingService.createAndVerify(request)` — create + GET by ID + assert fields match
- `BookingService.updateAndVerify(id, request, token)` — PUT + GET + assert updated fields
- `BookingService.deleteAndVerify(id, token)` — DELETE (expect 201) + GET (expect 404)

### 05_utils — Utilities

- `DataFactory.buildBookingRequest()` → `BookingRequest` with `@faker-js/faker` data
- `DataFactory.buildAuthRequest()` → `AuthRequest` from config
- `DateUtils.futureDate(daysAhead: number)` → `yyyy-MM-dd` string
- `DateUtils.today()` → `yyyy-MM-dd` string

### fixtures/api-fixtures.ts — DI Layer

Extends Playwright `test` with:
- `authClient` — `AuthClient` instance
- `bookingClient` — `BookingClient` instance
- `authService` — `AuthService` instance
- `bookingService` — `BookingService` instance

Tests import `test` from fixtures, not from `@playwright/test` directly.

### 06_tests — Test Specs

**auth.spec.ts (2 tests):**
- `verify token generated with valid credentials` → token not null, length > 0
- `verify bad credentials returns "Bad credentials" body` → status 200, body contains "Bad credentials"

**booking.spec.ts (7 tests):**
- `verify GET all bookings returns non-empty list` → 200, array.length > 0
- `verify POST create booking returns created data` → 200, bookingid > 0, fields match
- `verify GET booking by ID returns correct data` → 200, firstname/lastname match
- `verify PUT update booking reflects changes` → 200, GET confirms updated fields
- `verify PATCH partial update changes only specified field` → 200, patched field changed, others unchanged
- `verify DELETE without token returns 403` → 403
- `verify DELETE with valid token returns 201, GET returns 404` → 201 then 404

**filter.spec.ts (4 tests):**
- `verify filter by firstname returns matching bookings` → 200, list size > 0
- `verify filter by lastname returns matching bookings` → 200, list size > 0
- `verify filter by checkin date returns 200` → 200
- `verify filter by non-existent name returns empty list or 404` → empty array or 404

---

## playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';
import { config } from './src/01_config/config';

export default defineConfig({
  testDir: './tests',
  timeout: config.timeout,
  use: {
    baseURL: config.baseURL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' }
  },
  reporter: [['html'], ['json', { outputFile: 'test-results/results.json' }]],
  projects: [{ name: 'api' }]
});
```

---

## Run Commands

```bash
cd RestAPI-Framework_Task

npm install                        # install deps
npm test                           # run all tests
npm run test:auth                  # auth tests only
npm run test:booking               # booking tests only
npm run test:filter                # filter tests only
npx playwright show-report         # open HTML report
```

---

## Anti-Hallucination Rules Applied

- DELETE `/booking/{id}` returns **201** not 200 (Restful Booker quirk)
- Auth endpoint returns **200** even for bad creds — must check body not status
- Token auth via **Cookie header**: `Cookie: token=<value>` (not Bearer)
- Filter params: `firstname`, `lastname`, `checkin`, `checkout` (exact field names from API docs)

---

## Out of Scope

- UI testing (use `Playwright Automation Framework/` for that)
- Database validation
- CI/CD pipeline
- Multi-environment config (single baseURL sufficient)
