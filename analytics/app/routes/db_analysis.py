from datetime import datetime
from fastapi import APIRouter, Query
from app.models.schemas import Order, Payment
from app.services.data_service import fetch_orders, fetch_payments
from app.services.reconcile_service import assign_customer_segments, summarize_segments
from app.services.run_service import create_analysis_run, save_customer_segment_results, fetch_analysis_runs
from app.services.trend_service import fetch_exposure_trend, fetch_segment_count_trend, fetch_severity_trend
from app.services.simulation_service import simulate_next_week_db

router = APIRouter()


@router.get("/customer-segments-db")
def customer_segments_db():
    orders_data = fetch_orders()
    payments_data = fetch_payments()

    orders = [
        Order(
            order_id=o["order_id"],
            customer=o["customer"],
            item=o["item"],
            amount=o["amount"],
        )
        for o in orders_data
    ]

    payments = [
        Payment(
            customer=p["customer"],
            amount=p["amount"],
        )
        for p in payments_data
    ]

    return assign_customer_segments(orders, payments)


@router.get("/segment-summary-db")
def segment_summary_db():
    orders_data = fetch_orders()
    payments_data = fetch_payments()

    orders = [
        Order(
            order_id=o["order_id"],
            customer=o["customer"],
            item=o["item"],
            amount=o["amount"],
        )
        for o in orders_data
    ]

    payments = [
        Payment(
            customer=p["customer"],
            amount=p["amount"],
        )
        for p in payments_data
    ]

    return summarize_segments(orders, payments)

@router.post("/run-analysis-db")
def run_analysis_db():
    orders_data = fetch_orders()
    payments_data = fetch_payments()

    orders = [
        Order(
            order_id=o["order_id"],
            customer=o["customer"],
            item=o["item"],
            amount=o["amount"],
        )
        for o in orders_data
    ]

    payments = [
        Payment(
            customer=p["customer"],
            amount=p["amount"],
        )
        for p in payments_data
    ]

    results = assign_customer_segments(orders, payments)
    customers = results["customers"]

    run_id = create_analysis_run(
        source_name="postgres.orders_payments",
        notes="DB-backed segmentation run",
    )
    inserted_count = save_customer_segment_results(run_id, customers)

    return {
        "run_id": run_id,
        "saved_results": inserted_count,
        "customers": customers,
    }

@router.get("/analysis-runs")
def analysis_runs():
    return {"runs": fetch_analysis_runs()}

@router.get("/trends/exposure")
def trends_exposure():
    return {"runs": fetch_exposure_trend()}


@router.get("/trends/segments")
def trends_segments():
    return {"runs": fetch_segment_count_trend()}


@router.get("/trends/severity")
def trends_severity():
    return {"runs": fetch_severity_trend()}

@router.post("/simulate-week-db")
def simulate_week_db(start_date: datetime | None = Query(default=None)):
    return simulate_next_week_db(start_date=start_date)