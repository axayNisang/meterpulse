# Manual QA Test Report: MeterPulse Billing Engine

**Tested By**: Senior Manual & Systems QA Tester  
**Date Tested**: November 25, 2026  
**Environment**: Localhost (`Node.js v22.0.0`, port `3001`)  
**Verdict**: **PASSED (100% Functional & Resilient)**

---

## 1. How to Run and Test This Project Locally

Follow these simple steps in your terminal to boot up the live server and run tests:

```bash
# Step 1: Open the meterpulse project directory
cd meterpulse

# Step 2: Build the TypeScript code to JavaScript
npm run build

# Step 3: Start the server on port 3001
PORT=3001 node dist/server.js
```

You will see:
```text
[MeterPulse] Usage-Based Billing Engine running on port 3001
```

Now open a new terminal window to hit the APIs using `curl` as shown below.

---

## 2. Real-User Workflows & Edge-Case Results

### Test 1: Server Healthcheck
- **Action**: Check if the server is healthy.
- **cURL Command**:
  ```bash
  curl -i http://localhost:3001/health
  ```
- **Result Received**:
  ```json
  HTTP/1.1 200 OK
  {
    "status": "UP",
    "uptime": 1.95,
    "timestamp": "2026-11-25T13:00:43.090Z"
  }
  ```
- **Verdict**: **PASS**

---

### Test 2: Ingest a Legitimate Usage Event (Happy Path)
- **Action**: A client application reports 1 API call consumed by `cust_acme_corp`.
- **cURL Command**:
  ```bash
  curl -i -X POST http://localhost:3001/api/v1/events \
    -H "Content-Type: application/json" \
    -d '{
      "idempotencyKey": "qa_req_001_live",
      "customerId": "cust_acme_corp",
      "meterCode": "api_requests",
      "value": 1,
      "timestamp": "2026-11-25T13:00:00Z"
    }'
  ```
- **Result Received**:
  ```json
  HTTP/1.1 202 Accepted
  {
    "eventId": "888efb8d-232e-4fe7-abdd-da6c1f3d562a",
    "status": "ACCEPTED",
    "meterCode": "api_requests",
    "recordedAt": "2026-11-25T13:00:43.127Z"
  }
  ```
- **Verdict**: **PASS** (Event accepted into ledger).

---

### Test 3: [Edge Case] Duplicate Request Replay Attack
- **Action**: Network glitch causes client to retry the exact same request.
- **cURL Command**:
  ```bash
  curl -i -X POST http://localhost:3001/api/v1/events \
    -H "Content-Type: application/json" \
    -d '{
      "idempotencyKey": "qa_req_001_live",
      "customerId": "cust_acme_corp",
      "meterCode": "api_requests",
      "value": 1,
      "timestamp": "2026-11-25T13:00:00Z"
    }'
  ```
- **Result Received**:
  ```json
  HTTP/1.1 200 OK
  {
    "eventId": "888efb8d-232e-4fe7-abdd-da6c1f3d562a",
    "status": "DUPLICATE",
    "meterCode": "api_requests",
    "recordedAt": "2026-11-25T13:00:43.127Z"
  }
  ```
- **Verdict**: **PASS** (Server recognized duplicate idempotency key, did not double-bill customer, and safely returned existing receipt).

---

### Test 4: [Edge Case] Reusing Idempotency Key with Tampered Payload
- **Action**: Attacker reuses previous key `qa_req_001_live` with `value: 99999`.
- **cURL Command**:
  ```bash
  curl -i -X POST http://localhost:3001/api/v1/events \
    -H "Content-Type: application/json" \
    -d '{
      "idempotencyKey": "qa_req_001_live",
      "customerId": "cust_acme_corp",
      "meterCode": "api_requests",
      "value": 99999,
      "timestamp": "2026-11-25T13:00:00Z"
    }'
  ```
- **Result Received**:
  ```json
  HTTP/1.1 400 Bad Request
  {
    "error": "Idempotency conflict: Key 'qa_req_001_live' reused with different payload."
  }
  ```
- **Verdict**: **PASS** (Tampered replay detected via SHA-256 hash mismatch and safely rejected).

---

### Test 5: [Edge Case] Hostile Negative Consumption Value
- **Action**: Client passes negative number `-150` to attempt balance deduction.
- **cURL Command**:
  ```bash
  curl -i -X POST http://localhost:3001/api/v1/events \
    -H "Content-Type: application/json" \
    -d '{
      "idempotencyKey": "qa_neg_01",
      "customerId": "cust_acme_corp",
      "meterCode": "api_requests",
      "value": -150,
      "timestamp": "2026-11-25T13:00:00Z"
    }'
  ```
- **Result Received**:
  ```json
  HTTP/1.1 400 Bad Request
  {
    "error": "Invalid event: value must be a non-negative number"
  }
  ```
- **Verdict**: **PASS** (Negative numbers strictly blocked).

---

### Test 6: Ingest Batch Events
- **Action**: Batch send 2 API calls and 45.5 seconds of compute execution.
- **cURL Command**:
  ```bash
  curl -i -X POST http://localhost:3001/api/v1/events/batch \
    -H "Content-Type: application/json" \
    -d '{
      "events": [
        { "idempotencyKey": "b1", "customerId": "cust_acme_corp", "meterCode": "api_requests", "value": 1, "timestamp": "2026-11-25T13:00:00Z" },
        { "idempotencyKey": "b2", "customerId": "cust_acme_corp", "meterCode": "api_requests", "value": 1, "timestamp": "2026-11-25T13:00:00Z" },
        { "idempotencyKey": "b3", "customerId": "cust_acme_corp", "meterCode": "compute_seconds", "value": 45.5, "timestamp": "2026-11-25T13:00:00Z" }
      ]
    }'
  ```
- **Result Received**:
  ```json
  HTTP/1.1 202 Accepted
  {
    "total": 3,
    "accepted": 3,
    "duplicates": 0
  }
  ```
- **Verdict**: **PASS**

---

### Test 7: Generate Final Itemized Invoice
- **Action**: End of billing month: calculate subscription fee, tiered usage charges, and 18% tax.
- **cURL Command**:
  ```bash
  curl -i -X POST http://localhost:3001/api/v1/invoices/generate \
    -H "Content-Type: application/json" \
    -d '{
      "customerId": "cust_acme_corp",
      "planId": "plan_enterprise_api",
      "start": "2026-11-01T00:00:00Z",
      "end": "2026-11-30T23:59:59Z",
      "taxRatePercent": 18
    }'
  ```
- **Result Received**:
  ```json
  HTTP/1.1 200 OK
  {
    "id": "inv_22ff149ab7704643",
    "customerId": "cust_acme_corp",
    "baseFee": 4900,
    "lineItems": [
      {
        "meterCode": "api_requests",
        "description": "API Calls",
        "units": 3,
        "rateDescription": "Graduated: [3 @ $0.0000]",
        "subtotal": 0
      },
      {
        "meterCode": "compute_seconds",
        "description": "Serverless Execution Duration",
        "units": 45.5,
        "rateDescription": "45.5 units @ $0.0002/unit",
        "subtotal": 1
      }
    ],
    "subtotal": 4901,
    "tax": 882,
    "total": 5783,
    "currency": "USD",
    "status": "ISSUED"
  }
  ```
- **Calculation Verification**:
  - Base Fee: \$49.00 (4900 cents)
  - API Calls (3): Free tier ($< 10,000$ free) = \$0.00
  - Compute Seconds (45.5 s @ \$0.0002/s): \$0.01 (1 cent)
  - Subtotal: \$49.01 (4901 cents)
  - Tax (18% of 4901): \$8.82 (882 cents)
  - **Total**: **\$57.83** (5783 cents)
- **Verdict**: **PASS (Mathematical calculations match down to the exact cent)**
