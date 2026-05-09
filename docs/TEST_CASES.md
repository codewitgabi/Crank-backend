# Test Cases — Types, Payloads, and Rules

This document describes how **test cases** are modeled in Crank Backend, what each **test type** requires, and how **`request`**, **profiles**, and **assertions** combine in API payloads.

All routes are under:

`POST | GET | PATCH | DELETE /api/v1/projects/:projectId/test-cases`

and related subpaths (`/:testCaseId`, `/:testCaseId/run`, `/:testCaseId/summaries/:summaryId`). Routes require **authentication** and **project access** as enforced in services.

---

## Enumerations

### `testType` (required on create)

| Value | Meaning |
|-------|---------|
| `LOAD` | Steady load with ramps using `loadProfile`. |
| `STRESS` | Step-wise increasing concurrency using `stressProfile`. |
| `SPIKE` | Base load, spike, cooldown using `spikeProfile`. |
| `LATENCY` | Same scheduling shape as LOAD plus **percentile SLO checks** via `latencyProfile.customPoints`. |

### `status` (optional)

`DRAFT` | `ACTIVE` | `ARCHIVED` — default `DRAFT` at persistence layer if omitted where allowed.

### `request.method`

`GET` | `POST` | `PUT` | `PATCH` | `DELETE` | `HEAD` | `OPTIONS`

### Assertion `operator`

`eq` | `neq` | `gt` | `gte` | `lt` | `lte` | `contains` | `regex`

---

## Shared Request Object (`request`)

Every test case defines the **HTTP call** under test:

| Field | Type | Required (create) | Notes |
|-------|------|-------------------|--------|
| `method` | string | Yes | See enum above. |
| `url` | string | Yes | Full URL; validators allow `localhost` (`require_tld: false`). Max length 2048. |
| `headers` | object (string → string) | No | Default `{}`. |
| `query` | object (string → string) | No | Default `{}`; merged into URL query string. |
| `body` | string | No | Raw body (e.g. JSON string). Not used for `GET`/`HEAD` in execution. Max 1M chars in schema. |
| `timeoutMs` | number | No | 100–120000; default 30000. |

---

## Profile Rules by `testType`

Mongoose **pre-validate** enforces:

1. The **correct profile object** must be present for the chosen `testType`.
2. **Ramp constraint**: `rampUpSeconds + rampDownSeconds ≤ durationSeconds` for profiles that include those fields (`LOAD`, `STRESS`, `LATENCY`).
3. **STRESS**: `maxVus ≥ vus`.
4. **SPIKE**: `spikeVus > baseVus`.
5. **LATENCY**: `customPoints` must not contain **duplicate** `percentile` values.

### LOAD — `loadProfile`

| Field | Constraints |
|-------|-------------|
| `vus` | 1–100000 |
| `durationSeconds` | 1–86400 |
| `rampUpSeconds`, `rampDownSeconds` | 0–3600; sum ≤ `durationSeconds` |

### STRESS — `stressProfile`

Extends the ramp/duration idea of load with stepped VU growth:

| Field | Constraints |
|-------|-------------|
| `vus` | Starting VUs (1–100000) |
| `maxVus` | Ceiling (1–500000), must be ≥ `vus` |
| `durationSeconds` | 1–86400 |
| `stepDurationSeconds` | 1–3600 |
| `rampUpSeconds`, `rampDownSeconds` | 0–3600; sum ≤ `durationSeconds` |

### SPIKE — `spikeProfile`

Timeline is **warmup + spike hold + cooldown** (not the same as `durationSeconds` on LOAD):

| Field | Constraints |
|-------|-------------|
| `baseVus` | 1–100000 |
| `spikeVus` | 1–500000, must be **>** `baseVus` |
| `warmupSeconds` | 0–3600 |
| `spikeHoldSeconds` | 1–3600 |
| `cooldownSeconds` | 0–3600 |

### LATENCY — `latencyProfile`

| Field | Constraints |
|-------|-------------|
| `vus`, `durationSeconds`, `rampUpSeconds`, `rampDownSeconds` | Same numeric ranges as LOAD; ramps must satisfy sum rule. |
| `customPoints` | Array of `{ percentile, thresholdMs }` |

**Percentile semantics (execution)**

- Each point’s `percentile` is treated as **0–100** (schema 0.1–99.99).
- After a run, the engine compares **observed latency at that percentile** against `thresholdMs` and stores results on `TestRunSummary` (`latencyPercentileChecks`) when applicable.

---

## Assertions (`assertions`)

Optional array evaluated **per HTTP response sample** during a run:

| Field | Meaning |
|-------|---------|
| `key` | e.g. `statusCode`, `latencyMs`, `body`, `responseBody`, or `body.someJsonField` after parsing JSON body. |
| `operator` | See enum above. |
| `expected` | Compared according to operator (numbers coerced where applicable). |

**Note:** For **LATENCY test type**, **SLO percentile checks** come from **`latencyProfile.customPoints`**, not from the generic `assertions` array.

---

## API Validation (express-validator snapshot)

**Create**

- Requires: `name`, `testType`, `request`, `request.method`, `request.url`.
- Optional: `slug`, `description`, `status`, nested `request` fields, `tags`, profiles, `assertions` — **Mongoose** still enforces profile presence for the chosen type.

**Update (`PATCH`)**

- All fields optional at HTTP layer; server merges into the document with guardrails (`project`, `createdBy`, etc. are not writable).

**Slug**

- Pattern: lowercase, digits, hyphen-separated segments (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
- If omitted on save, slug can be **derived from `name`** in model `pre('validate')`.

---

## Example Payloads

### LOAD

```json
{
  "name": "Checkout health LOAD",
  "testType": "LOAD",
  "request": {
    "method": "GET",
    "url": "https://api.example.com/health",
    "headers": { "Accept": "application/json" },
    "query": {},
    "timeoutMs": 15000
  },
  "loadProfile": {
    "vus": 20,
    "durationSeconds": 120,
    "rampUpSeconds": 30,
    "rampDownSeconds": 30
  },
  "assertions": [
    { "key": "statusCode", "operator": "eq", "expected": 200 }
  ],
  "tags": ["smoke"],
  "status": "ACTIVE"
}
```

### STRESS

```json
{
  "name": "Order API stress ramp",
  "testType": "STRESS",
  "request": {
    "method": "POST",
    "url": "https://api.example.com/v1/orders",
    "headers": { "Content-Type": "application/json" },
    "query": {},
    "body": "{\"sku\":\"SKU-1\",\"qty\":1}",
    "timeoutMs": 30000
  },
  "stressProfile": {
    "vus": 10,
    "maxVus": 100,
    "durationSeconds": 300,
    "stepDurationSeconds": 60,
    "rampUpSeconds": 30,
    "rampDownSeconds": 30
  },
  "assertions": [],
  "tags": []
}
```

### SPIKE

```json
{
  "name": "Traffic spike drill",
  "testType": "SPIKE",
  "request": {
    "method": "GET",
    "url": "http://localhost:9000/api/v1/status",
    "headers": {},
    "query": {}
  },
  "spikeProfile": {
    "baseVus": 5,
    "spikeVus": 50,
    "warmupSeconds": 60,
    "spikeHoldSeconds": 120,
    "cooldownSeconds": 60
  },
  "assertions": [
    { "key": "statusCode", "operator": "eq", "expected": 200 },
    { "key": "latencyMs", "operator": "lte", "expected": 500 }
  ],
  "tags": []
}
```

### LATENCY

```json
{
  "name": "Latency SLO regression",
  "testType": "LATENCY",
  "request": {
    "method": "GET",
    "url": "https://api.example.com/v1/users/me",
    "headers": { "Authorization": "Bearer <token>" },
    "query": {}
  },
  "latencyProfile": {
    "vus": 15,
    "durationSeconds": 180,
    "rampUpSeconds": 45,
    "rampDownSeconds": 45,
    "customPoints": [
      { "percentile": 50, "thresholdMs": 120 },
      { "percentile": 95, "thresholdMs": 400 },
      { "percentile": 99, "thresholdMs": 800 }
    ]
  },
  "assertions": [
    { "key": "statusCode", "operator": "eq", "expected": 200 }
  ],
  "tags": ["sla"]
}
```

---

## Execution & Persistence (conceptual)

- **Queued**: Jobs use **Redis**; **workers** (`npm run dev:worker`) execute **`runLoadTestAgainstCase`** and write **`TestRunSummary`** documents with **`source: "worker"`**.
- **Manual `POST …/run`**: Returns **202** quickly; execution runs **inline** on the API with **`source: "inline"`** in the summary; correlate via returned **`jobId`**.
- **Read APIs**: List test cases, get one test case with summary IDs (`id`, timestamps only), get full **`TestRunSummary`** at `GET …/summaries/:summaryId`.

For operational logging and troubleshooting, see application logs keyed by **`test-run-worker`** / **`testRunExecution`** / **`testRun.executor`**.
