"""
AgriTrace FastAPI Backend Gateway
Exposes complete REST API routes for AI Perception, Shelf-Life Prediction,
Multi-Agent Orchestration, SmartBag Telemetry, Marketplace, QR Traceability, and Analytics.
"""

from typing import Dict, Any, List, Optional
import io
import time
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai.version_registry import get_system_manifest, MODEL_VERSIONS
from ai.vision.inference import run_vision_pipeline
from ai.shelf_life.xgboost_model import predict_shelf_life
from ai.reasoning.fuzzy_engine import evaluate_fuzzy_risk
from ai.nlp.rag_engine import query_agritrace_nlp
from agents.orchestrator.orchestrator import orchestrate_batch
from backend.database import DB

app = FastAPI(
    title="AgriTrace Agentic AI Gateway",
    description="Autonomous Agentic AI Platform for Post-Harvest Food Waste Reduction and Produce Intelligence",
    version="1.0.0"
)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/")
def serve_index():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "AgriTrace Backend API Gateway running."}

# ----------------- SYSTEM & MANIFEST -----------------
@app.get("/api/manifest")
def get_manifest():
    return get_system_manifest()

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "AgriTrace AI Engine",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "active_models": MODEL_VERSIONS
    }

# ----------------- AI PERCEPTION (CV) -----------------
@app.post("/api/produce/analyze")
async def analyze_produce(file: UploadFile = File(...)):
    """
    Sprint 1 Vision Perception Pipeline:
    Uploads image -> Quality Check -> OOD Check -> DenseNet-121 -> Grad-CAM
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    result = run_vision_pipeline(image)
    return result

# ----------------- SHELF-LIFE PREDICTION -----------------
class ShelfLifeRequest(BaseModel):
    produce_type: str = "tomato"
    freshness_score: float = 75.0
    quality_score: float = 75.0
    defect_probability: float = 0.15
    temperature_c: float = 22.0
    humidity_rh: float = 80.0
    harvest_age_days: float = 1.0
    storage_type: str = "ambient"

@app.post("/api/shelf-life/predict")
def predict_shelf_life_endpoint(req: ShelfLifeRequest):
    return predict_shelf_life(
        produce_type=req.produce_type,
        freshness_score=req.freshness_score,
        quality_score=req.quality_score,
        defect_probability=req.defect_probability,
        temperature_c=req.temperature_c,
        humidity_rh=req.humidity_rh,
        harvest_age_days=req.harvest_age_days,
        storage_type=req.storage_type
    )

# ----------------- AGENT ORCHESTRATION -----------------
@app.post("/api/agents/run")
async def run_agent_orchestrator(
    batch_id: str = Form("BATCH-TOM-001"),
    produce_type: str = Form("tomato"),
    quantity_kg: float = Form(500.0),
    temperature_c: float = Form(24.0),
    humidity_rh: float = Form(78.0),
    gas_voc_ppm: float = Form(18.0),
    market_trend: str = Form("falling"),
    smartbag_active: bool = Form(True),
    file: Optional[UploadFile] = File(None)
):
    """
    Executes the autonomous 9-Agent DAG workflow coordinating perception,
    shelf-life, environmental risk, market intelligence, buyer matching, and decision action.
    """
    image = None
    if file:
        try:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception:
            pass

    telemetry = {
        "temperature_c": temperature_c,
        "humidity_rh": humidity_rh,
        "gas_voc_ppm": gas_voc_ppm,
        "smartbag_active": smartbag_active
    }

    result = orchestrate_batch(
        batch_id=batch_id,
        image=image,
        produce_type=produce_type,
        quantity_kg=quantity_kg,
        telemetry=telemetry,
        market_trend=market_trend,
        candidate_buyers=list(DB.buyers.values())
    )

    # Save to database memory
    DB.agent_runs[result["run_id"]] = result
    return result

# ----------------- BATCH MANAGEMENT -----------------
@app.get("/api/batches")
def list_batches():
    return DB.get_batches()

@app.get("/api/batches/{batch_id}")
def get_batch(batch_id: str):
    batch = DB.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch

@app.post("/api/batches")
def create_batch(batch: Dict[str, Any]):
    return DB.create_batch(batch)

@app.patch("/api/batches/{batch_id}/status")
def update_batch_status(batch_id: str, payload: Dict[str, str]):
    new_status = payload.get("status", "ACTIVE")
    res = DB.update_batch_status(batch_id, new_status)
    if not res:
        raise HTTPException(status_code=404, detail="Batch not found")
    return res

# ----------------- SMARTBAG IOT -----------------
@app.get("/api/smartbag/{smartbag_id}/status")
def get_smartbag_status(smartbag_id: str):
    return {
        "smartbag_id": smartbag_id,
        "telemetry": {
            "temperature_c": 14.2,
            "humidity_rh": 84.5,
            "gas_voc_ppm": 12.0,
            "cooling_actuator": "ACTIVE",
            "ventilation_fan": "STANDBY",
            "battery_percentage": 91
        },
        "target_temperature_c": 13.5,
        "holding_produce": "Tomato Batch #BATCH-TOM-001",
        "last_sync": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@app.post("/api/smartbag/{smartbag_id}/action")
def execute_smartbag_action(smartbag_id: str, action: Dict[str, str]):
    command = action.get("command", "COOL")
    return {
        "smartbag_id": smartbag_id,
        "command_executed": command,
        "status": "COMMAND_ENACTED",
        "new_state": {
            "cooling_actuator": "HIGH" if command == "COOL" else "OFF",
            "ventilation_fan": "ACTIVE" if command == "VENTILATE" else "STANDBY"
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

# ----------------- BUYERS MARKETPLACE -----------------
@app.get("/api/buyers")
def list_buyers():
    return list(DB.buyers.values())

# ----------------- ALERTS -----------------
@app.get("/api/alerts")
def get_alerts():
    return DB.alerts

@app.patch("/api/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    for a in DB.alerts:
        if a["id"] == alert_id:
            a["resolved"] = True
            return a
    raise HTTPException(status_code=404, detail="Alert not found")

# ----------------- QR TRACEABILITY -----------------
@app.get("/api/traceability/{batch_id}")
def get_traceability_record(batch_id: str):
    batch = DB.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return {
        "batch_id": batch["id"],
        "qr_hash": batch["qr_hash"],
        "farm_name": batch.get("farm_name", "AgriTrace Partner Farm"),
        "farmer_name": batch.get("farmer_name", "Verified Producer"),
        "location": batch.get("location", "Maharashtra, India"),
        "produce_type": batch["produce_type"],
        "harvest_date": batch["harvest_date"],
        "freshness_grade": batch.get("freshness_grade", "Fresh"),
        "quality_score": batch.get("quality_score", 85.0),
        "status": batch["status"],
        "storage_mode": batch.get("storage_type", "SmartBag"),
        "inspection_history": [
            {"date": "2026-09-03", "event": "Batch harvested and registered at farm gate"},
            {"date": "2026-09-04", "event": "Vision-D121 AI quality inspection passed (Grade: A)"},
            {"date": "2026-09-05", "event": "SmartBag IoT microclimate tracking active"}
        ],
        "verification_url": f"https://agritrace.ai/verify/{batch['qr_hash']}"
    }

# ----------------- DOMAIN NLP / RAG -----------------
class NLPRequest(BaseModel):
    query: str
    active_batch_id: Optional[str] = None

@app.post("/api/nlp/query")
def nlp_query(req: NLPRequest):
    batch = DB.get_batch(req.active_batch_id) if req.active_batch_id else None
    return query_agritrace_nlp(user_query=req.query, active_batch=batch)

# ----------------- FEEDBACK & HUMAN OVERRIDE -----------------
@app.post("/api/feedback")
def record_feedback(feedback: Dict[str, Any]):
    return DB.log_feedback(feedback)

# ----------------- SUSTAINABILITY ANALYTICS -----------------
@app.get("/api/analytics/sustainability")
def get_sustainability():
    return DB.calculate_sustainability_metrics()
