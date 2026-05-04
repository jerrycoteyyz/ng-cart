# Customer Reconciliation and Segmentation Engine

A Python-based analytics service that reconciles customer orders and payments, detects anomalies, segments customers by financial behavior, and produces action-oriented summaries for operations teams.

## What this project does

This service ingests order and payment data, then:

- reconciles balances by customer
- detects statistical anomalies
- segments customers using unsupervised machine learning
- assigns operational actions such as collect, recover, audit, investigate, retain, and monitor
- classifies severity levels
- summarizes exposure by segment

## Why this project matters

This project demonstrates how backend engineering, data analytics, and machine learning can be combined into a practical decision-support system.

It goes beyond CRUD and basic reporting by turning raw transaction data into:

- risk signals
- customer behavior segments
- priority-based operational recommendations
- executive-level summaries

## Features

### Reconciliation
- Aggregates total orders and payments by customer
- Computes customer balance
- Flags missing payment / missing order cases

### Statistical analytics
- Calculates z-scores on payment behavior
- Applies IQR-style anomaly logic
- Surfaces unusual customer payment patterns

### Customer segmentation
Uses engineered features such as:
- total_orders
- total_payments
- balance
- order_count
- payment_count
- avg_order_value
- avg_payment_value

These are scaled and clustered using K-Means.

### Decision layer
Each customer is assigned:
- `segment_label`
- `priority`
- `action`
- `reason`
- `severity`

### Segment summary
Aggregates segment-level metrics such as:
- customer count
- total positive balance
- total negative balance
- average balance
- severity distribution

## Example segment labels

- unpaid_customers
- underpaying_customers
- payment_heavy
- high_anomaly_overpay
- extreme_outlier
- healthy_active
- mid_tier_mixed

## Tech stack

- Python
- FastAPI
- pandas
- NumPy
- scikit-learn
- Pydantic
- pytest

## API endpoints

### Health
`GET /health`

### Reconciliation
`POST /api/reconcile`

Returns customer-level reconciliation results, anomaly fields, and data quality outputs.

### Customer segments
`POST /api/customer-segments`

Returns customer segmentation output with labels, actions, priority, and severity.

### Segment summary
`POST /api/segment-summary`

Returns segment-level aggregated risk and exposure metrics.

## Example workflow

1. Submit orders and payments as JSON
2. Reconcile customer balances
3. Generate segment assignments
4. Review segment summary for operational priorities

## Sample business insights this system can provide

- Which customers have the highest unpaid exposure
- Which customers are trending toward delinquency
- Which payment behaviors are anomalous
- Which segment should operations act on first
- Whether the customer base is stable or skewed toward risk

## Project structure

```text
stat_reconcile/
├── app/
│   ├── main.py
│   ├── models/
│   ├── routes/
│   └── services/
├── tests/
├── sample_payload.json
├── sample_payload_large.json
└── README.md