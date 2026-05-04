from app.db import get_connection

def fetch_orders():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT order_id, customer, item, amount, order_timestamp
                FROM v_orders_for_analysis
                ORDER BY order_timestamp
            """)
            rows = cur.fetchall()

        return [
            {
                "order_id": row[0],
                "customer": row[1],
                "item": row[2],
                "amount": float(row[3]),
                "order_timestamp": row[4].isoformat(sep=" "),
            }
            for row in rows
        ]
    finally:
        conn.close()


def fetch_payments():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT payment_id, customer, amount, payment_timestamp
                FROM v_payments_for_analysis
                ORDER BY payment_timestamp
            """)
            rows = cur.fetchall()

        return [
            {
                "payment_id": row[0],
                "customer": row[1],
                "amount": float(row[2]),
                "payment_timestamp": row[3].isoformat(sep=" "),
            }
            for row in rows
        ]
    finally:
        conn.close()