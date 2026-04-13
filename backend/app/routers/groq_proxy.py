from fastapi import APIRouter
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
load_dotenv()

router = APIRouter(prefix="/groq", tags=["groq"])

GROQ_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.1-8b-instant"

class GroqRequest(BaseModel):
    system: str
    user: str

class VoiceRequest(BaseModel):
    query: str

@router.post("/voice")
async def groq_voice(req: VoiceRequest):
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": "You are EduConnect AI tutor assistant. Answer the student's question in 2-3 sentences max. Be friendly, clear, and educational."},
                    {"role": "user", "content": req.query},
                ],
            },
        )
        data = res.json()
        return {"text": data["choices"][0]["message"]["content"]}

@router.post("/chat")
async def groq_chat(req: GroqRequest):
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": req.system},
                    {"role": "user", "content": req.user},
                ],
            },
        )
        data = res.json()
        return {"text": data["choices"][0]["message"]["content"]}
