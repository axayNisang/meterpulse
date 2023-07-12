# MeterPulse

High-throughput usage-based metering and rating engine designed for B2B SaaS and cloud infrastructure products.

## Overview
MeterPulse ingests high-frequency consumption events (API requests, compute minutes, storage GB), deduplicates payloads using atomic idempotency locks, aggregates metrics across billing windows, and generates itemized invoices according to customizable pricing models.
