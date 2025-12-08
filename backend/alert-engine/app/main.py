import asyncio
import logging
from contextlib import asynccontextmanager
from typing import List
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.config import get_settings
from app.alerts import alert_engine, Alert
from app.elasticsearch_client import es_client
from app import mongodb_client

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def poll_vitals_and_generate_alerts():
    """Background task to poll vitals and generate alerts."""
    async with httpx.AsyncClient() as client:
        while True:
            try:
                response = await client.get(f"{settings.vitals_service_url}/api/patients", timeout=10.0)
                if response.status_code == 200:
                    patients = response.json()
                    for patient in patients:
                        alerts = alert_engine.analyze_vitals(patient["id"], patient.get("vitals", {}))
                        # Dual-write: Log alerts to both Elasticsearch AND MongoDB
                        for alert in alerts:
                            alert_data = alert.model_dump()
                            # Write to Elasticsearch (for real-time monitoring)
                            es_client.log_alert(alert_data)
                            # Write to MongoDB (for persistence and summarization)
                            await mongodb_client.save_alert(alert_data)
            except Exception as e:
                logger.error(f"Error polling vitals: {e}")

            await asyncio.sleep(5)  # Poll every 5 seconds


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info(f"Starting {settings.service_name} v{settings.service_version}")

    # Connect to MongoDB
    await mongodb_client.connect()

    # Persist seed alerts to MongoDB on startup
    await persist_seed_alerts_to_mongodb()

    # Start background polling task
    task = asyncio.create_task(poll_vitals_and_generate_alerts())

    yield

    # Cleanup
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    # Disconnect from MongoDB
    await mongodb_client.disconnect()

    logger.info("Shutting down alert engine")


async def persist_seed_alerts_to_mongodb():
    """Save seed alerts from memory to MongoDB if they don't exist."""
    logger.info("Persisting seed alerts to MongoDB...")
    saved_count = 0
    for patient_id, alerts in alert_engine.active_alerts.items():
        for alert in alerts:
            alert_data = alert.model_dump()
            result = await mongodb_client.save_alert(alert_data)
            if result:
                saved_count += 1
    logger.info(f"Persisted {saved_count} seed alerts to MongoDB")


# Create FastAPI app
app = FastAPI(
    title="Alert Engine Service",
    description="Rule-based clinical alert detection service",
    version=settings.service_version,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.service_name,
        "version": settings.service_version,
        "elasticsearch": es_client.health_check(),
        "mongodb": mongodb_client.is_connected(),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/alerts", response_model=None)
async def get_all_alerts() -> List[dict]:
    """Get all active alerts (from in-memory cache)."""
    alerts = alert_engine.get_all_alerts()
    return [alert.model_dump() for alert in alerts]


@app.get("/api/alerts/{patient_id}")
async def get_patient_alerts(patient_id: str, source: str = "both", limit: int = 5) -> List[dict]:
    """Get alerts for a specific patient.

    Args:
        patient_id: The patient ID
        source: Where to fetch from - 'memory' (real-time), 'mongodb' (persistent), or 'both'
        limit: Maximum number of alerts to return (default 5)
    """
    if source == "memory":
        # Get from in-memory cache (real-time, but may lose data on restart)
        alerts = alert_engine.get_patient_alerts(patient_id)
        return [alert.model_dump() for alert in alerts][:limit]
    elif source == "mongodb":
        # Get from MongoDB (persistent, historical)
        return await mongodb_client.get_patient_alerts(patient_id, limit=limit)
    else:
        # Combine both sources, deduplicate by alert_id
        memory_alerts = [alert.model_dump() for alert in alert_engine.get_patient_alerts(patient_id)]
        mongo_alerts = await mongodb_client.get_patient_alerts(patient_id, limit=limit)

        # Use alert_id to deduplicate
        seen_ids = set()
        combined = []

        for alert in memory_alerts + mongo_alerts:
            alert_id = alert.get("alert_id") or alert.get("id")
            if alert_id and alert_id not in seen_ids:
                seen_ids.add(alert_id)
                combined.append(alert)

        # Sort by timestamp descending
        combined.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return combined[:limit]  # Return only requested limit


@app.get("/api/alerts/{patient_id}/history")
async def get_patient_alerts_history(patient_id: str, limit: int = 100) -> List[dict]:
    """Get historical alerts for a patient from MongoDB."""
    return await mongodb_client.get_patient_alerts(patient_id, limit=limit)


@app.get("/api/alerts/{patient_id}/recent")
async def get_recent_alerts_for_summary(patient_id: str, count: int = 5) -> List[dict]:
    """Get the most recent alerts for summarization (default 5)."""
    return await mongodb_client.get_recent_alerts(patient_id, count=count)


@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """Acknowledge an alert."""
    # Acknowledge in memory
    success = alert_engine.acknowledge_alert(alert_id)
    # Also acknowledge in MongoDB
    await mongodb_client.acknowledge_alert(alert_id)

    if not success:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return {"status": "acknowledged", "alert_id": alert_id}


@app.delete("/api/alerts/{patient_id}")
async def clear_patient_alerts(patient_id: str):
    """Clear all alerts for a patient (in-memory only)."""
    alert_engine.clear_patient_alerts(patient_id)
    return {"status": "cleared", "patient_id": patient_id}


@app.post("/api/analyze")
async def analyze_vitals(patient_id: str, vitals: dict):
    """Manually analyze vitals and generate alerts."""
    alerts = alert_engine.analyze_vitals(patient_id, vitals)
    for alert in alerts:
        alert_data = alert.model_dump()
        es_client.log_alert(alert_data)
        await mongodb_client.save_alert(alert_data)
    return {"alerts": [alert.model_dump() for alert in alerts]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
