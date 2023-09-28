# MeterPulse ⚡

[![CI Pipeline](https://github.com/axayNisang/meterpulse/actions/workflows/ci.yml/badge.svg)](https://github.com/axayNisang/meterpulse/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%20%7C%2020-green.svg)](https://nodejs.org)

**MeterPulse** is a high-throughput, usage-based metering and billing engine built for B2B SaaS, API platforms, and cloud infrastructure providers. It solves the critical engineering hurdles of metered pricing: guaranteeing idempotency under network retries, real-time windowed aggregations, and complex multi-tier rating calculations (graduated brackets, volume tiers, and overages).

---

## 🏗 Architecture & System Design

```
                     +---------------------------------------+
                     |         API Telemetry Client          |
                     +---------------------------------------+
                                         │
                                         ▼ [POST /api/v1/events]
                     +---------------------------------------+
                     |        Event Ingestion Service        |
                     +---------------------------------------+
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
      +----------------------------+            +----------------------------+
      |     Idempotency Store      |            |      Event Ledger Store    |
      |   (SHA-256 Hash Matching)  |            |   (Indexed by Cust/Meter)  |
      +----------------------------+            +----------------------------+
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         ▼
                     +---------------------------------------+
                     |      Windowed Aggregation Engine      |
                     |     (SUM, COUNT, MAX, UNIQUE_COUNT)   |
                     +---------------------------------------+
                                         │
                                         ▼
                     +---------------------------------------+
                     |      Multi-Tier Rating Engine         |
                     |  - Graduated Brackets (Marginal Rate) |
                     |  - Volume-Based Tiers                 |
                     |  - Base Subscriptions & Overages      |
                     +---------------------------------------+
                                         │
                                         ▼
                     +---------------------------------------+
                     |       Itemized Invoice Generator      |
                     |        (JSON / Accounting Ready)      |
                     +---------------------------------------+
```

---

## 🎯 Key Capabilities

- **Strict Exactly-Once Ingestion Semantics**: Every incoming event payload is hashed using SHA-256 against its `idempotencyKey`. Network retries receive the original receipt instantaneously without corrupting ledger totals; conflicting reuses trigger safe 400 Bad Request conflicts.
- **Pluggable Aggregation Strategies**:
  - `SUM`: Network bandwidth (GB transferred), execution time.
  - `COUNT`: Total API requests, database queries executed.
  - `MAX`: Peak concurrent compute workers, maximum peak memory usage.
  - `UNIQUE_COUNT`: Distinct active users, unique IP visitors.
- **Complex Rating Engine**:
  - **Graduated / Bracket Pricing**: Units cost progressively less as thresholds are crossed (e.g. First 10k free, next 90k at $0.001, >100k at $0.0005).
  - **Volume Pricing**: Bulk discount applied to all units once total threshold is reached.
  - **Subscription Flat Fees & Minimum Spends**.
- **Itemized Invoice Generation**: Outputs detailed line-item receipts with boundary timestamps, breakdown formulas, sub-totals, and jurisdictional tax calculation.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.x
- Docker & Docker Compose (optional for containerized deployment)

### Local Installation

```bash
# Clone the repository
git clone https://github.com/axayNisang/meterpulse.git
cd meterpulse

# Install dependencies
npm install

# Run unit and integration tests
npm test

# Build TypeScript to JavaScript
npm run build

# Start local server
npm start
```

### Running with Docker

```bash
docker-compose up -d --build
```

---

## 📡 API Reference

### Ingest Usage Event
`POST /api/v1/events`

```json
{
  "idempotencyKey": "req_prod_9876543210",
  "customerId": "cust_acme_corp",
  "meterCode": "api_requests",
  "value": 1,
  "timestamp": "2023-09-28T10:00:00Z"
}
```

**Response (`202 Accepted`):**
```json
{
  "eventId": "e9b28f73-2dc7-4bca-9411-cf492b950dc9",
  "status": "ACCEPTED",
  "meterCode": "api_requests",
  "recordedAt": "2023-09-28T10:00:00.124Z"
}
```

### Generate Real-Time Invoice
`POST /api/v1/invoices/generate`

```json
{
  "customerId": "cust_acme_corp",
  "planId": "plan_enterprise_api",
  "start": "2023-09-01T00:00:00Z",
  "end": "2023-09-30T23:59:59Z",
  "taxRatePercent": 18
}
```

---

## 🧪 Testing & Verification

Comprehensive test suites covering edge cases in bracket calculations, concurrent replay attacks, and boundary thresholds:

```bash
npm test
```

Test results include:
- `tests/pricing.test.ts`: Graduated progressive tiers vs volume-based calculation.
- `tests/idempotency.test.ts`: Hash collision rejection and duplicate idempotency handling.

---

## 📄 License
MIT License. Created by [Akshay Nisang](https://github.com/axayNisang).
