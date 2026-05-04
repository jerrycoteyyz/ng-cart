from app.services.reconcile_service import reconcile_data
from app.models.schemas import Order, Payment


def test_reconcile_basic_balances():
    orders = [
        Order(order_id=1, customer="A", item="Item1", amount=100.0),
        Order(order_id=2, customer="B", item="Item2", amount=200.0),
    ]

    payments = [
        Payment(customer="A", amount=100.0),
        Payment(customer="B", amount=50.0),
    ]

    result = reconcile_data(orders, payments)
    customers = {c["customer"]: c for c in result["customers"]}

    assert customers["A"]["balance"] == 0.0
    assert customers["B"]["balance"] == 150.0


def test_payment_without_order_gets_flagged():
    orders = []
    payments = [Payment(customer="Ghost", amount=500.0)]

    result = reconcile_data(orders, payments)
    customer = result["customers"][0]

    assert customer["customer"] == "Ghost"
    assert "payment with no matching order" in customer["issues"]
    assert customer["data_quality_score"] < 100


def test_order_without_payment_gets_flagged():
    orders = [Order(order_id=1, customer="A", item="Item1", amount=75.0)]
    payments = []

    result = reconcile_data(orders, payments)
    customer = result["customers"][0]

    assert "order with no payment" in customer["issues"]
    assert customer["balance"] == 75.0