"""MongoDB client for alert persistence."""
import logging
from datetime import datetime
from typing import Optional, List, Dict
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import DESCENDING

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Global MongoDB client
_client: Optional[AsyncIOMotorClient] = None
_db = None


async def connect():
    """Connect to MongoDB."""
    global _client, _db
    try:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
        _db = _client[settings.mongodb_database]

        # Create indexes for efficient querying
        alerts_collection = _db[settings.mongodb_alerts_collection]
        await alerts_collection.create_index([("patient_id", 1), ("timestamp", DESCENDING)])
        await alerts_collection.create_index([("timestamp", DESCENDING)])
        await alerts_collection.create_index([("acknowledged", 1)])

        # Test connection
        await _client.admin.command('ping')
        logger.info(f"Connected to MongoDB: {settings.mongodb_database}")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        return False


async def disconnect():
    """Disconnect from MongoDB."""
    global _client
    if _client:
        _client.close()
        _client = None
        logger.info("Disconnected from MongoDB")


async def save_alert(alert_data: Dict) -> Optional[str]:
    """Save an alert to MongoDB."""
    global _db
    if _db is None:
        logger.warning("MongoDB not connected, cannot save alert")
        return None

    try:
        collection = _db[settings.mongodb_alerts_collection]

        # Add metadata
        alert_data["created_at"] = datetime.now()
        alert_data["acknowledged"] = alert_data.get("acknowledged", False)

        result = await collection.insert_one(alert_data)
        logger.debug(f"Saved alert to MongoDB: {result.inserted_id}")
        return str(result.inserted_id)
    except Exception as e:
        logger.error(f"Failed to save alert to MongoDB: {e}")
        return None


async def get_patient_alerts(patient_id: str, limit: int = 50) -> List[Dict]:
    """Get alerts for a specific patient from MongoDB."""
    global _db
    if _db is None:
        logger.warning("MongoDB not connected")
        return []

    try:
        collection = _db[settings.mongodb_alerts_collection]
        cursor = collection.find(
            {"patient_id": patient_id}
        ).sort("timestamp", DESCENDING).limit(limit)

        alerts = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])  # Convert ObjectId to string
            alerts.append(doc)

        return alerts
    except Exception as e:
        logger.error(f"Failed to get alerts from MongoDB: {e}")
        return []


async def get_recent_alerts(patient_id: str, count: int = 10) -> List[Dict]:
    """Get the most recent alerts for a patient (for summarization)."""
    return await get_patient_alerts(patient_id, limit=count)


async def acknowledge_alert(alert_id: str) -> bool:
    """Mark an alert as acknowledged in MongoDB."""
    global _db
    if _db is None:
        return False

    try:
        from bson import ObjectId
        collection = _db[settings.mongodb_alerts_collection]
        result = await collection.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"acknowledged": True, "acknowledged_at": datetime.now()}}
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Failed to acknowledge alert: {e}")
        return False


async def get_alerts_count(patient_id: str) -> int:
    """Get total count of alerts for a patient."""
    global _db
    if _db is None:
        return 0

    try:
        collection = _db[settings.mongodb_alerts_collection]
        count = await collection.count_documents({"patient_id": patient_id})
        return count
    except Exception as e:
        logger.error(f"Failed to count alerts: {e}")
        return 0


def is_connected() -> bool:
    """Check if MongoDB is connected."""
    return _client is not None
