from fastapi import APIRouter
from pydantic import BaseModel
from firebase_admin import db
import time

router = APIRouter(prefix="/notifications", tags=["notifications"])

class NotificationPayload(BaseModel):
    uid: str
    title: str
    body: str
    type: str  # assignment | message | live | progress

@router.post("/send")
def send_notification(payload: NotificationPayload):
    ref = db.reference(f"notifications/{payload.uid}")
    ref.push({
        "title": payload.title,
        "body": payload.body,
        "type": payload.type,
        "read": False,
        "timestamp": int(time.time() * 1000),
    })
    return {"status": "sent"}

@router.post("/broadcast")
def broadcast_notification(payload: NotificationPayload):
    """Send notification to all users (teacher broadcasts)"""
    from firebase_admin import firestore
    fs = firestore.client()
    users = fs.collection("users").stream()
    ref_root = db.reference("notifications")
    for u in users:
        ref_root.child(u.id).push({
            "title": payload.title,
            "body": payload.body,
            "type": payload.type,
            "read": False,
            "timestamp": int(time.time() * 1000),
        })
    return {"status": "broadcast sent"}
