import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, X, Loader } from "lucide-react";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const API = "http://localhost:8000";

const NAV_COMMANDS = [
  { keywords: ["open chat", "go to chat", "one on one", "direct message"], route: "/chat", reply: "Opening 1-on-1 chat." },
  { keywords: ["open group", "go to group", "classroom"], route: "/group", reply: "Opening classrooms." },
  { keywords: ["notification", "open notification"], route: "/notifications", reply: "Opening notifications." },
  { keywords: ["open ai", "ai learning", "go to ai"], route: "/ai", reply: "Opening AI learning." },
  { keywords: ["learning path", "adaptive", "go to adaptive"], route: "/adaptive", reply: "Opening learning path." },
  { keywords: ["skill tracker", "open skills", "my skills"], route: "/skills", reply: "Opening skill tracker." },
  { keywords: ["accessibility"], route: "/accessibility", reply: "Opening accessibility page." },
  { keywords: ["live class", "open live", "join class"], route: "/live", reply: "Opening live class." },
  { keywords: ["quiz", "open quiz", "go to quiz", "take quiz", "start quiz", "attempt quiz"], route: "/quiz", reply: "Opening quiz page." },
];

function speak(text) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  window.speechSynthesis.speak(u);
}

async function askAI(query) {
  const res = await fetch(`${API}/groq/voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Gemini unavailable");
  const data = await res.json();
  return data.text;
}

export default function VoiceAssistant() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const recogRef = useRef(null);
  const navigate = useNavigate();

  const handleResult = useCallback(async (text) => {
    setTranscript(text);
    const lower = text.toLowerCase();

    // Navigation commands — handled locally, no API call
    const match = NAV_COMMANDS.find(c => c.keywords.some(k => lower.includes(k)));
    if (match) {
      setReply(match.reply);
      speak(match.reply);
      setTimeout(() => navigate(match.route), 800);
      return;
    }

    // Help
    if (lower.trim() === "help") {
      const r = "Say a page name like: open chat, live class, skill tracker. Or ask me any study question!";
      setReply(r); speak(r);
      return;
    }

    // Everything else → Gemini AI
    setLoading(true);
    setReply("");
    try {
      const answer = await askAI(text);
      setReply(answer);
      speak(answer);
      // If AI response is about quiz, navigate after speaking
      if (answer.toLowerCase().includes("quiz") && lower.includes("quiz")) {
        setTimeout(() => navigate("/quiz"), 1500);
      }
    } catch {
      const err = "Couldn't reach Gemini. Check your API key and backend.";
      setReply(err); speak(err);
    }
    setLoading(false);
  }, [navigate]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setReply("Speech recognition not supported. Use Chrome or Edge."); return;
    }
    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.onresult = (e) => handleResult(e.results[0][0].transcript);
    recog.onerror = () => { setListening(false); setReply("Couldn't hear you. Try again."); };
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    recog.start();
    setListening(true);
    setTranscript("");
    setReply("");
  }, [handleResult]);

  const stopListening = () => {
    recogRef.current?.stop();
    setListening(false);
  };

  return (
    <>
      <button className="va-fab" onClick={() => setOpen(o => !o)} title="Gemini Voice Assistant">
        <Mic size={20} />
      </button>

      {open && (
        <div className="va-panel">
          <div className="va-panel-header">
            <span>✨ AI Voice Assistant</span>
            <button onClick={() => setOpen(false)}><X size={16} /></button>
          </div>
          <p className="va-hint">Ask any question or say a page name to navigate.</p>

          <button
            className={`va-mic-btn ${listening ? "active" : ""}`}
            onClick={listening ? stopListening : startListening}
            disabled={loading}
          >
            {listening
              ? <><MicOff size={18} /> Listening...</>
              : <><Mic size={18} /> Speak</>}
          </button>

          {transcript && <div className="va-transcript">🎤 {transcript}</div>}

          {loading && (
            <div className="va-reply" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Loader size={14} className="spin" /> Thinking...
            </div>
          )}
          {!loading && reply && <div className="va-reply">🤖 {reply}</div>}

          <div className="va-commands">
            Navigate: "open chat" · "live class" · "skill tracker" · "quiz" · "notifications"<br />
            Or ask anything: "What is photosynthesis?"
          </div>
        </div>
      )}
    </>
  );
}
