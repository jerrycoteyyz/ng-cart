from fastapi import APIRouter
from app.services.reconcile_service import build_dataframes, compute_payment_stats
from app.models.schemas import ReconcileRequest

router = APIRouter()


@router.post("/metrics")
def metrics(request: ReconcileRequest):
    orders_df, payments_df = build_dataframes(request.orders, request.payments)

    payment_mean, payment_std = compute_payment_stats(payments_df)

    return {
        "total_orders": len(orders_df),
        "total_payments": len(payments_df),
        "unique_customers": len(set(orders_df["customer"]).union(set(payments_df["customer"]))),
        "avg_payment": payment_mean,
        "payment_std_dev": payment_std,
    }