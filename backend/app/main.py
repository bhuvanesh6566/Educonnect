from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.firebase_admin_config import init_firebase
from app.routers import ai_learning, notifications, groq_proxy, gemini

init_firebase()

app = FastAPI(title="EduConnect API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_learning.router)
app.include_router(notifications.router)
app.include_router(groq_proxy.router)
app.include_router(gemini.router)

@app.get("/")
def root():
    return {"message": "EduConnect API running"}
