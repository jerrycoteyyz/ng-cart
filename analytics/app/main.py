import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.reconcile import router as reconcile_router
from app.routes.metrics import router as metrics_router
from app.routes.segments import router as segments_router
from app.routes.segment_summary import router as segment_summary_router
from app.routes.db_analysis import router as db_analysis_router

app = FastAPI(title="Statistical Reconciliation Engine")
# 👇 ADD THIS BLOCK HERE
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGIN", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reconcile_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
app.include_router(segments_router, prefix="/api")
app.include_router(segment_summary_router, prefix="/api")
app.include_router(db_analysis_router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}