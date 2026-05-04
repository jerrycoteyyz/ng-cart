from psycopg2.extras import execute_batch
from app.db import get_connection


def create_analysis_run(source_name: str | None = None, notes: str | None = None) -> int:
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO analysis_runs (source_name, notes)
                    VALUES (%s, %s)
                    RETURNING run_id
                    """,
                    (source_name, notes),
                )
                run_id = cur.fetchone()[0]
        return run_id
    finally:
        conn.close()


def save_customer_segment_results(run_id: int, customers: list[dict]) -> int:
    if not customers:
        return 0

    rows = [
        (
            run_id,
            c["customer"],
            c["segment_label"],
            c["priority"],
            c["action"],
            c["severity"],
            c.get("reason", ""),
            c["total_orders"],
            c["total_payments"],
            c["balance"],
            c["order_count"],
            c["payment_count"],
            c["avg_order_value"],
            c["avg_payment_value"],
        )
        for c in customers
    ]

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                execute_batch(
                    cur,
                    """
                    INSERT INTO customer_segment_results (
                        run_id,
                        customer,
                        segment_label,
                        priority,
                        action,
                        severity,
                        reason,
                        total_orders,
                        total_payments,
                        balance,
                        order_count,
                        payment_count,
                        avg_order_value,
                        avg_payment_value
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    rows,
                    page_size=500,
                )
        return len(rows)
    finally:
        conn.close()

def fetch_analysis_runs() -> list[dict]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT run_id, run_timestamp, source_name, notes
                FROM analysis_runs
                ORDER BY run_timestamp DESC
                """
            )
            rows = cur.fetchall()

        return [
            {
                "run_id": row[0],
                "run_timestamp": row[1].isoformat(sep=" "),
                "source_name": row[2],
                "notes": row[3],
            }
            for row in rows
        ]
    finally:
        conn.close()