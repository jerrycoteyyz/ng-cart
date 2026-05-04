from pydantic import BaseModel
from typing import List, Optional

class Order(BaseModel):
    order_id: int
    customer: str
    item: str
    amount: float

class Payment(BaseModel):
    customer: str
    amount: float

class CustomerSummary(BaseModel):
    customer: str
    total_orders: float
    total_payments: float
    balance: float
    order_count: int
    payment_count: int
    z_score: float
    iqr_flag: bool
    anomoly_flag: bool
    anomoly_reason: Optional[str] = None
    data_quality_score: int
    issues: List[str]

class ReconcileRequest(BaseModel):
    orders: List[Order]
    payments: List[Payment]

class ReconcileResponse(BaseModel):
    customers: List[CustomerSummary]

class CustomerSegment(BaseModel):
    customer: str
    segment: int
    segment_label: str
    priority: int
    action: str
    reason: str
    total_orders: float
    total_payments: float
    balance: float
    severity: str
    order_count: int
    payment_count: int
    avg_order_value: float
    avg_payment_value: float

class CustomerSegmentsResponse(BaseModel):
    customers: List[CustomerSegment]

class SegmentSummary(BaseModel):
    segment_label: str
    customer_count: int
    total_positive_balance: float
    total_negative_balance: float
    avg_balance: float
    max_balance: float
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    priority: int
    action: str

class SegmentSummaryResponse(BaseModel):
    segments: List[SegmentSummary]