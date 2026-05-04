from app.db import get_connection


def fetch_exposure_trend():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ar.run_id,
                    ar.run_timestamp,
                    COALESCE(SUM(CASE WHEN csr.balance > 0 THEN csr.balance ELSE 0 END), 0) AS total_positive_balance,
                    COALESCE(SUM(CASE WHEN csr.balance < 0 THEN csr.balance ELSE 0 END), 0) AS total_negative_balance
                FROM analysis_runs ar
                LEFT JOIN customer_segment_results csr
                    ON ar.run_id = csr.run_id
                GROUP BY ar.run_id, ar.run_timestamp
                ORDER BY ar.run_timestamp
                """
            )
            rows = cur.fetchall()

        return [
            {
                "run_id": row[0],
                "run_timestamp": row[1].isoformat(sep=" "),
                "total_positive_balance": float(row[2]),
                "total_negative_balance": float(row[3]),
            }
            for row in rows
        ]
    finally:
        conn.close()


def fetch_segment_count_trend():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ar.run_id,
                    ar.run_timestamp,
                    csr.segment_label,
                    COUNT(*) AS customer_count
                FROM analysis_runs ar
                JOIN customer_segment_results csr
                    ON ar.run_id = csr.run_id
                GROUP BY ar.run_id, ar.run_timestamp, csr.segment_label
                ORDER BY ar.run_timestamp, csr.segment_label
                """
            )
            rows = cur.fetchall()

        return [
            {
                "run_id": row[0],
                "run_timestamp": row[1].isoformat(sep=" "),
                "segment_label": row[2],
                "customer_count": row[3],
            }
            for row in rows
        ]
    finally:
        conn.close()


def fetch_severity_trend():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ar.run_id,
                    ar.run_timestamp,
                    csr.severity,
                    COUNT(*) AS customer_count
                FROM analysis_runs ar
                JOIN customer_segment_results csr
                    ON ar.run_id = csr.run_id
                GROUP BY ar.run_id, ar.run_timestamp, csr.severity
                ORDER BY ar.run_timestamp, csr.severity
                """
            )
            rows = cur.fetchall()

        return [
            {
                "run_id": row[0],
                "run_timestamp": row[1].isoformat(sep=" "),
                "severity": row[2],
                "customer_count": row[3],
            }
            for row in rows
        ]
    finally:
        conn.close()