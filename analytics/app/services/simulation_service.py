import random
from datetime import datetime, timedelta

from app.db import get_connection


def simulate_next_week_db(start_date: datetime | None = None):
    conn = get_connection()
    random.seed()

    try:
        with conn:
            with conn.cursor() as cur:
                # latest timestamps in DB
                cur.execute("SELECT COALESCE(MAX(order_timestamp), NOW()) FROM orders")
                max_order_ts = cur.fetchone()[0]

                cur.execute("SELECT COALESCE(MAX(payment_timestamp), NOW()) FROM payments")
                max_payment_ts = cur.fetchone()[0]

                most_recent_ts = max(max_order_ts, max_payment_ts)

                # If caller provided a start_date, use it.
                # Otherwise start after the most recent existing data.
                if start_date is not None:
                    week_start = start_date
                else:
                    week_start = most_recent_ts + timedelta(days=1)

                week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)

                # existing customers
                cur.execute("SELECT DISTINCT customer FROM orders")
                order_customers = {row[0] for row in cur.fetchall()}

                cur.execute("SELECT DISTINCT customer FROM payments")
                payment_customers = {row[0] for row in cur.fetchall()}

                existing_customers = sorted(order_customers | payment_customers)

                # add some new customers each simulated week
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM (
                        SELECT DISTINCT customer
                        FROM orders
                        WHERE customer LIKE 'Customer_NEW_%'
                        UNION
                        SELECT DISTINCT customer
                        FROM payments
                        WHERE customer LIKE 'Customer_NEW_%'
                    ) t
                    """
                )
                existing_new_count = cur.fetchone()[0]
                new_customers = [
                    f"Customer_NEW_{i}"
                    for i in range(existing_new_count + 1, existing_new_count + 6)
                ]

                all_customers = existing_customers + new_customers

                # next ids
                cur.execute("SELECT COALESCE(MAX(order_id), 100000) FROM orders")
                next_order_id = cur.fetchone()[0] + 1

                cur.execute("SELECT COALESCE(MAX(payment_id), 500000) FROM payments")
                next_payment_id = cur.fetchone()[0] + 1

                items = [
                    "Laptop",
                    "Monitor",
                    "Keyboard",
                    "Mouse",
                    "Dock",
                    "Tablet",
                    "Headset",
                    "Webcam",
                ]

                def random_ts_in_week():
                    return week_start + timedelta(
                        days=random.randint(0, 6),
                        hours=random.randint(8, 18),
                        minutes=random.randint(0, 59),
                        seconds=random.randint(0, 59),
                    )

                orders_to_insert = []
                payments_to_insert = []

                selected_customers = random.sample(
                    all_customers,
                    k=min(len(all_customers), random.randint(35, 55)),
                )

                for customer in selected_customers:
                    # 1 to 4 orders during the week
                    num_orders = random.randint(1, 4)
                    customer_order_total = 0.0

                    for _ in range(num_orders):
                        order_ts = random_ts_in_week()
                        amount = round(random.uniform(150, 2200), 2)
                        customer_order_total += amount

                        orders_to_insert.append(
                            (
                                next_order_id,
                                customer,
                                random.choice(items),
                                amount,
                                order_ts,
                            )
                        )
                        next_order_id += 1

                    # some customers pay nothing, some partial, some balanced, some heavy
                    payment_pattern = random.choices(
                        ["none", "partial", "balanced", "heavy"],
                        weights=[15, 35, 35, 15],
                        k=1,
                    )[0]

                    if payment_pattern == "none":
                        continue

                    if payment_pattern == "partial":
                        target_payment = customer_order_total * random.uniform(0.25, 0.75)
                        num_payments = random.randint(1, 3)
                    elif payment_pattern == "balanced":
                        target_payment = customer_order_total * random.uniform(0.85, 1.10)
                        num_payments = random.randint(1, 4)
                    else:  # heavy
                        target_payment = customer_order_total * random.uniform(1.15, 2.25)
                        num_payments = random.randint(2, 5)

                    remaining = round(target_payment, 2)

                    for i in range(num_payments):
                        payment_ts = random_ts_in_week()

                        if i == num_payments - 1:
                            amount = round(max(0.01, remaining), 2)
                        else:
                            max_allowed = max(
                                0.01,
                                round(remaining - 0.01 * (num_payments - i - 1), 2),
                            )
                            amount = round(random.uniform(50, max_allowed), 2)
                            remaining = round(remaining - amount, 2)

                        payments_to_insert.append(
                            (
                                next_payment_id,
                                customer,
                                amount,
                                payment_ts,
                            )
                        )
                        next_payment_id += 1

                cur.executemany(
                    """
                    INSERT INTO orders (order_id, customer, item, amount, order_timestamp)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    orders_to_insert,
                )

                cur.executemany(
                    """
                    INSERT INTO payments (payment_id, customer, amount, payment_timestamp)
                    VALUES (%s, %s, %s, %s)
                    """,
                    payments_to_insert,
                )

        return {
            "message": "Simulated one additional week of orders and payments",
            "week_start": week_start.isoformat(sep=" "),
            "week_end": week_end.isoformat(sep=" "),
            "orders_inserted": len(orders_to_insert),
            "payments_inserted": len(payments_to_insert),
            "new_customers_added": new_customers,
            "used_custom_start_date": start_date is not None,
        }

    finally:
        conn.close()