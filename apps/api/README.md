# Crank Backend

Backend service for **Crank** — defining, executing, and recording API load tests in a multi-tenant **project** model.

---

## Overview

Crank Backend provides:

- **REST APIs** for authentication, projects (memberships, invitations), and **test cases** scoped to projects.
- **Configurable load profiles** (LOAD, STRESS, SPIKE, LATENCY) executed against arbitrary HTTP targets.
- **Asynchronous execution** via **Redis / BullMQ** worker processes for queued runs (e.g. runs triggered after creating a test case).
- **Inline execution** for manual **`POST …/run`** triggers (non-blocking HTTP response while the suite runs in the API process).
- **Persistent run history** in MongoDB (`TestRunSummary`) with aggregates and optional latency percentile evaluation.

Detailed payload rules and examples for test cases live in **[docs/TEST_CASES.md](./docs/TEST_CASES.md)**.

---

## Technology Stack

| Area | Choice |
|------|--------|
| Runtime | Node.js |
| Framework | Express 5 |
| Data store | MongoDB (Mongoose) |
| Jobs / queues | Redis + BullMQ |
| Auth | JWT (access/refresh); optional integrations per configuration |
| Logging | Pino (+ pino-pretty in non-production) |
| Testing | Vitest |

---

## Repository Layout (high level)

| Path | Responsibility |
|------|----------------|
| `src/server.ts` | HTTP server bootstrap |
| `src/worker.ts` | Worker process bootstrap (Mongo + BullMQ consumers) |
| `src/app.ts` | Express app wiring |
| `src/routes/` | Route definitions |
| `src/services/` | Domain logic |
| `src/models/` | Mongoose schemas |
| `src/queues/`, `src/workers/` | Queue producers and consumers |
| `tests/` | Automated tests |

---

## Prerequisites

- **Node.js** (align with team LTS policy; TypeScript targets ES2016+).
- **MongoDB** instance (connection string via environment).
- **Redis** instance for queued test runs (`REDIS_HOST`, `REDIS_PORT`, optional credentials).

---

## Configuration

Environment variables are loaded via **dotenv** (`src/utils/constants.ts`). Typical values:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URI` | MongoDB connection string |
| `DATABASE_URI_TEST` | Separate DB for automated tests (`NODE_ENV=test`) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | JWT signing |
| `JWT_EXPIRE`, `JWT_REFRESH_EXPIRE` | Token TTLs |
| `REDIS_HOST`, `REDIS_PORT` | Redis broker (required for enqueue path) |
| `REDIS_USERNAME`, `REDIS_PASSWORD` | Optional Redis ACL |
| `SMTP_*`, `FRONTEND_URL`, etc. | Mail and product URLs as needed |
| `GOOGLE_CLIENT_ID` | Google Sign-In — must match the **Web** client used by the SPA (`aud` on `id_token`) |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth app — **secret** is required for `POST /api/v1/auth/oauth/github/exchange` (authorization code → access token) |

Treat secrets as **classified**: never commit `.env`; use vault or CI secrets in deployment.

---

## Local Development

```bash
npm install
cp .env.example .env   # if your team maintains one; populate values
npm run dev              # API — default port from app config (e.g. 7000)
```

In a **second terminal**, run the worker so **queued** jobs (e.g. post–create enqueue) are consumed:

```bash
npm run dev:worker
```

Build and production-style start:

```bash
npm run build
npm start                  # API
npm run start:worker       # Worker
```

---

## API Surface (summary)

Base path for versioned routes: **`/api/v1`**.

| Area | Prefix | Notes |
|------|--------|--------|
| Auth | `/api/v1/auth` | Registration, login, tokens, etc. |
| Projects | `/api/v1/projects` | CRUD, membership, invitations |
| Test cases | `/api/v1/projects/:projectId/test-cases` | CRUD, list, detail with summary IDs, run, summary detail |

All test-case routes require **authenticated** callers with appropriate **project membership** (read vs write rules enforced in services).

---

## Operational Notes

- **Queues**: The API enqueues work to Redis; **workers must be scaled and monitored** like any other consumer service.
- **Manual run**: `POST …/test-cases/:testCaseId/run` returns **202** immediately; results land in **`TestRunSummary`** when the run completes — clients should poll or subscribe per product design.
- **Logs**: Structured logs use **Pino**; worker entrypoints enable logging even when `NODE_ENV=test` when launched as `worker.{ts,js}`.
- **Rate limiting & security**: Global middleware includes rate limiting, helmet, and CORS configuration — review `src/app.ts` before production rollout.

---

## Testing

```bash
npm test
npm run test:integration
npm run test:coverage
```

---

## Documentation

- **[Test case types and payloads](./docs/TEST_CASES.md)** — schemas, validation, and JSON examples.

---

## Support & Contribution

- **Issues**: use the repository issue tracker linked in `package.json`.
- **Contributions**: follow existing patterns (services, validators, thin controllers); keep API changes backward compatible or document breaking changes in release notes.

---

## License

See **LICENSE** or **`package.json`** `"license"` field for the project’s legal terms.
