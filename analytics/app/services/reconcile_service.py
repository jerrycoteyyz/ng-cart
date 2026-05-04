from collections import defaultdict
from statistics import mean, pstdev
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


def build_dataframes(orders, payments):
    orders_df = pd.DataFrame([o.model_dump() for o in orders])
    payments_df = pd.DataFrame([p.model_dump() for p in payments])
    return orders_df, payments_df

def compute_payment_stats(payments_df):
    if payments_df.empty:
        return 0, 0

    totals = payments_df.groupby("customer")["amount"].sum()

    mean_val = totals.mean()
    std_val = totals.std(ddof=0) if len(totals) > 1 else 0

    return mean_val, std_val

def reconcile_data(orders, payments):

    orders_df, payments_df = build_dataframes(orders, payments)

    payment_mean, payment_std = compute_payment_stats(payments_df)
    iqr_lower, iqr_upper = compute_iqr_bounds(payments_df)

    customer_orders = defaultdict(list)
    customer_payments = defaultdict(list)

    # Build order map
    for order in orders:
        customer_orders[order.customer].append(float(order.amount))

    # Build payment map
    for payment in payments:
        customer_payments[payment.customer].append(float(payment.amount))

    all_customers = set(customer_orders.keys()) | set(customer_payments.keys())
    summaries = []

    # Payment totals for anomoly detection
    payment_totals = [sum(customer_payments[customer]) for customer in all_customers]

    payment_mean = mean(payment_totals) if payment_totals else 0
    payment_std = pstdev(payment_totals) if len(payment_totals) > 1 else 0

    for customer in sorted(all_customers):
        orders_list = customer_orders[customer]
        payments_list = customer_payments[customer]

        total_orders = round(sum(orders_list), 2)
        total_payments = round(sum(payments_list), 2)
        balance = round(total_orders - total_payments, 2)

        issues = []
        score = 100

        if total_orders == 0:
            issues.append("payment with no matching order")
            score -= 20

        if total_payments == 0:
            issues.append("order with no payment")
            score -= 20

        if any(amount <= 0 for amount in orders_list):
            issues.append("invalid order amount detected")
            score -= 30

        if any(amount <= 0 for amount in payments_list):
            issues.append("invalid payment amount detected")
            score -= 30

        if len(orders_list) != len(set(orders_list)):
            issues.append("duplicate order amounts detected")
            score -= 10            

        anomoly_flag = False
        anomoly_reason = None

        z_score = 0
        iqr_flag = False

        if payment_std > 0:
            z_score = (total_payments - payment_mean) / payment_std

        # IQR check
        if total_payments < iqr_lower or total_payments > iqr_upper:
            iqr_flag = True

        # Final anomaly decision
        anomaly_flag = False
        anomaly_reason = None

        if abs(z_score) > 2 and iqr_flag:
            anomaly_flag = True
            anomaly_reason = "statistically extreme (z-score + IQR)"
        elif iqr_flag:
            anomaly_flag = True
            anomaly_reason = "outside expected range (IQR)"
        elif abs(z_score) > 2:
            anomaly_flag = True
            anomaly_reason = "statistically unusual (z-score)"
        
        summaries.append(
            {
                "customer": customer,
                "total_orders": total_orders,
                "total_payments": total_payments,
                "balance": balance,
                "order_count": len(orders_list),
                "payment_count": len(payments_list),
                "anomoly_flag": anomoly_flag,
                "anomoly_reason": anomoly_reason,
                "z_score": round(z_score, 2),
                "iqr_flag": iqr_flag,
                "data_quality_score": max(score, 0),
                "issues": issues,
            }
        )

    return {"customers": summaries}

def build_customer_features(orders, payments):
    orders_df, payments_df = build_dataframes(orders, payments)

    if orders_df.empty:
        orders_agg = pd.DataFrame(columns=["customer", "total_orders", "order_count", "avg_order_value"])
    else:
        orders_agg = (
            orders_df.groupby("customer")
            .agg(
                total_orders=("amount", "sum"),
                order_count=("amount", "count"),
                avg_order_value=("amount", "mean"),
            )
            .reset_index()
        )

    if payments_df.empty:
        payments_agg = pd.DataFrame(columns=["customer", "total_payments", "payment_count", "avg_payment_value"])
    else:
        payments_agg = (
            payments_df.groupby("customer")
            .agg(
                total_payments=("amount", "sum"),
                payment_count=("amount", "count"),
                avg_payment_value=("amount", "mean"),
            )
            .reset_index()
        )

    features_df = pd.merge(orders_agg, payments_agg, on="customer", how="outer").fillna(0)

    features_df["balance"] = features_df["total_orders"] - features_df["total_payments"]

    numeric_cols = [
        "total_orders",
        "total_payments",
        "balance",
        "order_count",
        "payment_count",
        "avg_order_value",
        "avg_payment_value",
    ]

    for col in numeric_cols:
        features_df[col] = features_df[col].astype(float)

    return features_df

def classify_severity(balance):
    if balance > 0:
        # customer owes money
        if balance > 8000:
            return "critical"
        elif balance > 3000:
            return "high"
        elif balance > 1000:
            return "medium"
        else:
            return "low"

    else:
        # customer overpaid / anomaly
        abs_balance = abs(balance)

        if abs_balance > 10000:
            return "critical"
        elif abs_balance > 5000:
            return "high"
        elif abs_balance > 2000:
            return "medium"
        else:
            return "low"

def assign_labels_from_centers(centers_unscaled):
    """
    Dynamically assign segment labels to KMeans clusters by inspecting
    each cluster center's balance and payment ratio.
    KMeans cluster IDs are arbitrary, so labels must be derived from
    the actual characteristics of each cluster rather than hardcoded.

    Feature column order:
      0 total_orders  1 total_payments  2 balance
      3 order_count   4 payment_count   5 avg_order_value  6 avg_payment_value
    """
    n = len(centers_unscaled)
    labels = [None] * n
    assigned = set()

    info = []
    for i in range(n):
        c = centers_unscaled[i]
        orders    = float(c[0])
        payments  = float(c[1])
        balance   = float(c[2])
        pay_ratio = payments / orders if orders > 0.01 else (1.0 if payments > 0 else 0.0)
        info.append({'id': i, 'balance': balance, 'pay_ratio': pay_ratio})

    def rem():
        return [x for x in info if x['id'] not in assigned]

    def assign(cluster_id, label):
        labels[cluster_id] = label
        assigned.add(cluster_id)

    # unpaid_customers — highest positive balance with the lowest payment ratio
    candidates = sorted([x for x in info if x['balance'] > 0],
                        key=lambda x: -x['balance'] * (1 - min(x['pay_ratio'], 1)))
    if candidates:
        assign(candidates[0]['id'], 'unpaid_customers')

    # underpaying_customers — next highest positive balance (partial payments)
    candidates = sorted([x for x in rem() if x['balance'] > 0], key=lambda x: -x['balance'])
    if candidates:
        assign(candidates[0]['id'], 'underpaying_customers')

    # payment_heavy — most negative balance (payments exceed orders)
    if rem():
        assign(min(rem(), key=lambda x: x['balance'])['id'], 'payment_heavy')

    # healthy_active — closest balance to zero (well-balanced customers)
    if rem():
        assign(min(rem(), key=lambda x: abs(x['balance']))['id'], 'healthy_active')

    # high_anomaly_overpay — highest payment ratio among what remains
    if rem():
        assign(max(rem(), key=lambda x: x['pay_ratio'])['id'], 'high_anomaly_overpay')

    # mid_tier_mixed — next closest to zero balance
    if rem():
        assign(min(rem(), key=lambda x: abs(x['balance']))['id'], 'mid_tier_mixed')

    # extreme_outlier — whatever is left
    for x in rem():
        assign(x['id'], 'extreme_outlier')

    return labels


def assign_customer_segments(orders, payments, n_clusters=7):

    SEGMENT_ACTIONS = {
        "unpaid_customers": {
            "priority": 1,
            "action": "collect",
            "reason": "high order volume with no payment activity"
        },
        "underpaying_customers": {
            "priority": 2,
            "action": "recover",
            "reason": "partial payment activity with material outstanding balance"
        },
        "high_anomaly_overpay": {
            "priority": 1,
            "action": "investigate",
            "reason": "payment behavior is highly inconsistent with order volume"
        },
        "extreme_outlier": {
            "priority": 1,
            "action": "review",
            "reason": "customer behavior is statistically isolated from all other groups"
        },
        "payment_heavy": {
            "priority": 3,
            "action": "audit",
            "reason": "payments exceed orders and may indicate prepayment or misapplication"
        },
        "healthy_active": {
            "priority": 4,
            "action": "retain",
            "reason": "customer shows strong balanced order and payment activity"
        },
        "mid_tier_mixed": {
            "priority": 5,
            "action": "monitor",
            "reason": "customer behavior is moderate and mixed"
        }
    }

    features_df = build_customer_features(orders, payments)

    if features_df.empty:
        return {"customers": []}

    feature_cols = [
        "total_orders",
        "total_payments",
        "balance",
        "order_count",
        "payment_count",
        "avg_order_value",
        "avg_payment_value",
    ]

    if len(features_df) < n_clusters:
        n_clusters = len(features_df)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features_df[feature_cols])

    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    features_df["segment"] = model.fit_predict(X_scaled)

    # Derive labels from actual cluster center characteristics
    centers_unscaled = scaler.inverse_transform(model.cluster_centers_)
    segment_labels = assign_labels_from_centers(centers_unscaled)

    result = []
    for _, row in features_df.iterrows():
        segment_id = int(row["segment"])
        segment_label = segment_labels[segment_id]
        action_info = SEGMENT_ACTIONS[segment_label]

        result.append(
            {
                "customer": row["customer"],
                "segment": segment_id,
                "segment_label": segment_label,
                "priority": action_info["priority"],
                "action": action_info["action"],
                "reason": action_info["reason"],
                "total_orders": round(row["total_orders"], 2),
                "total_payments": round(row["total_payments"], 2),
                "balance": round(row["balance"], 2),
                "severity": classify_severity(round(row["balance"], 2)),
                "order_count": int(row["order_count"]),
                "payment_count": int(row["payment_count"]),
                "avg_order_value": round(row["avg_order_value"], 2),
                "avg_payment_value": round(row["avg_payment_value"], 2),
            }
        )

    return {"customers": result}

def compute_iqr_bounds(payments_df):
    if payments_df.empty:
        return 0, 0

    totals = payments_df.groupby("customer")["amount"].sum()

    if len(totals) < 4:
        # not enough data for quartiles
        return totals.min(), totals.max()

    q1 = totals.quantile(0.25)
    q3 = totals.quantile(0.75)
    iqr = q3 - q1

    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    return lower_bound, upper_bound

def summarize_segments(orders, payments):
    segment_result = assign_customer_segments(orders, payments)
    customers = segment_result["customers"]

    if not customers:
        return {"segments": []}

    summary_map = {}

    for customer in customers:
        label = customer["segment_label"]

        if label not in summary_map:
            summary_map[label] = {
                "segment_label": label,
                "customer_count": 0,
                "total_positive_balance": 0.0,
                "total_negative_balance": 0.0,
                "balance_sum": 0.0,
                "max_balance": None,
                "critical_count": 0,
                "high_count": 0,
                "medium_count": 0,
                "low_count": 0,
                "priority": customer["priority"],
                "action": customer["action"],
            }

        row = summary_map[label]
        balance = float(customer["balance"])
        severity = customer["severity"]

        row["customer_count"] += 1
        row["balance_sum"] += balance

        if balance > 0:
            row["total_positive_balance"] += balance
        elif balance < 0:
            row["total_negative_balance"] += balance

        if row["max_balance"] is None or balance > row["max_balance"]:
            row["max_balance"] = balance

        if severity == "critical":
            row["critical_count"] += 1
        elif severity == "high":
            row["high_count"] += 1
        elif severity == "medium":
            row["medium_count"] += 1
        elif severity == "low":
            row["low_count"] += 1

    segments = []

    for row in summary_map.values():
        avg_balance = row["balance_sum"] / row["customer_count"]

        segments.append(
            {
                "segment_label": row["segment_label"],
                "customer_count": row["customer_count"],
                "total_positive_balance": round(row["total_positive_balance"], 2),
                "total_negative_balance": round(row["total_negative_balance"], 2),
                "avg_balance": round(avg_balance, 2),
                "max_balance": round(row["max_balance"], 2) if row["max_balance"] is not None else 0.0,
                "critical_count": row["critical_count"],
                "high_count": row["high_count"],
                "medium_count": row["medium_count"],
                "low_count": row["low_count"],
                "priority": row["priority"],
                "action": row["action"],
            }
        )

    segments.sort(key=lambda x: (x["priority"], -x["customer_count"]))

    return {"segments": segments}