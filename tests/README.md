# Integration Test Setup

This project is configured for integration testing with Vitest + Supertest.

## 1) Test environment

1. Copy `.env.test.example` to `.env.test`.
2. Set `DATABASE_URI_TEST` to a dedicated test database.
3. Keep `.env.test` separate from dev/prod credentials.

## 2) Run tests

- `npm test` - run all tests once
- `npm run test:watch` - watch mode
- `npm run test:integration` - run integration suite only
- `npm run test:coverage` - run with coverage

## 3) Test lifecycle

- `tests/setup/env.setup.ts` loads `.env.test` and forces `NODE_ENV=test`.
- `tests/setup/db.setup.ts`:
  - connects before all tests
  - clears all collections after each test
  - drops test DB and closes connection after all tests

## 4) HTTP client helper

Use `tests/utils/test-client.ts` to test API routes through the Express app
without booting the production server process.
