from fastapi import APIRouter
from app.models.schemas import ReconcileRequest, CustomerSegmentsResponse
from app.services.reconcile_service import assign_customer_segments

router = APIRouter()


@router.post("/customer-segments", response_model=CustomerSegmentsResponse)
def customer_segments(request: ReconcileRequest):
    return assign_customer_segments(request.orders, request.payments)