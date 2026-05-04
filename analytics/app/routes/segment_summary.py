from fastapi import APIRouter
from app.models.schemas import ReconcileRequest, SegmentSummaryResponse
from app.services.reconcile_service import summarize_segments

router = APIRouter()


@router.post("/segment-summary", response_model=SegmentSummaryResponse)
def segment_summary(request: ReconcileRequest):
    return summarize_segments(request.orders, request.payments)