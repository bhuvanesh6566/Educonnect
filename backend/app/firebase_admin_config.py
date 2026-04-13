import os
import json
import firebase_admin
from firebase_admin import credentials, db
from dotenv import load_dotenv
load_dotenv()

def init_firebase():
    if not firebase_admin._apps:
        sa = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        if sa:
            cred = credentials.Certificate(json.loads(sa))
        else:
            cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred, {
            "databaseURL": "https://edtech-platform-e44d0-default-rtdb.firebaseio.com"
        })

def get_rtdb():
    return db
