from fastapi import APIRouter
from app.models.schemas import ReconcileRequest, ReconcileResponse
from app.services.reconcile_service import reconcile_data

router = APIRouter()


@router.post("/reconcile", response_model=ReconcileResponse)
def reconcile(request: ReconcileRequest):
    return reconcile_data(request.orders, request.payments)