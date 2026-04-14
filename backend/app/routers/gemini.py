import os
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

API_KEY = os.getenv("GEMINI_API_KEY", "")
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

router = APIRouter(prefix="/gemini", tags=["gemini"])

class VoiceRequest(BaseModel):
    query: str

@router.post("/voice")
async def gemini_voice(req: VoiceRequest):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set in .env")
    try:
        prompt = (
            "You are EduConnect AI tutor assistant. Answer the student's question "
            "in 2-3 sentences max. Be friendly, clear, and educational.\n\n"
            f"Student: {req.query}"
        )
        response = model.generate_content(prompt)
        return {"text": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
