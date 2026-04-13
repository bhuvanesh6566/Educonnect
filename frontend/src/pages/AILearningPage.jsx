import { useState } from "react";
import { Loader, Lightbulb, FileText, BookOpen, ArrowRight, ImageIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function groqChat(system, user) {
  const res = await fetch(`${API}/groq/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Server error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.text;
}

const TABS = [
  { id: "explain",   label: "AI",          icon: <Lightbulb size={16} /> },
  { id: "summarize", label: "Summarize",   icon: <FileText size={16} /> },
  { id: "flashcard", label: "Flashcards",  icon: <BookOpen size={16} /> },
  { id: "next",      label: "Next Topic",  icon: <ArrowRight size={16} /> },
  { id: "image",     label: "Image",       icon: <ImageIcon size={16} /> },
];

const TAB_CONFIG = {
  explain: {
    placeholder: "How can I help You today?",
    system: "You are an expert teacher. Explain the given concept in simple, clear language with examples. Use bullet points where helpful.",
    btn: "Explain",
  },
  summarize: {
    placeholder: "Paste any text or enter a topic to summarize...",
    system: "You are a concise summarizer. Summarize the given text or topic into key points. Use bullet points.",
    btn: "Summarize",
  },
  flashcard: {
    placeholder: "e.g., Photosynthesis, World War II, Python basics...",
    system: "Generate exactly 5 flashcards for the given topic. Format STRICTLY as:\nQ: <question>\nA: <answer>\n\nRepeat for all 5. No extra text.",
    btn: "Generate Flashcards",
  },
  next: {
    placeholder: "e.g., I just learned Algebra basics, Python loops...",
    system: "You are a learning path advisor. Given what the student just learned, suggest the next 5 topics they should study, with a one-line reason for each. Use a numbered list.",
    btn: "Get Next Topics",
  },
  image: {
    placeholder: "e.g., Photosynthesis, Solar System, Python loops...",
    system: "",
    btn: "Generate Image",
  },
};

function parseFlashcards(text) {
  const cards = [];
  const lines = text.split("\n");
  let current = {};
  for (const line of lines) {
    const q = line.match(/^Q:\s*(.+)/i);
    const a = line.match(/^A:\s*(.+)/i);
    if (q) current = { q: q[1].trim() };
    else if (a && current.q) { cards.push({ ...current, a: a[1].trim() }); current = {}; }
  }
  return cards;
}

function FlashcardView({ cards }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!cards.length) return <p style={{ color: "#e05a00" }}>Could not parse flashcards — try again.</p>;
  return (
    <div style={{ textAlign: "center" }}>
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          cursor: "pointer",
          background: flipped ? "var(--primary)" : "var(--surface2)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "40px 32px",
          minHeight: 140,
          fontSize: 18,
          fontWeight: 500,
          marginBottom: 16,
          transition: "all 0.3s",
          userSelect: "none",
        }}
      >
        {flipped ? cards[idx].a : cards[idx].q}
        <div style={{ fontSize: 12, marginTop: 12, opacity: 0.6 }}>
          {flipped ? "Answer — click to flip back" : "Question — click to reveal answer"}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, alignItems: "center" }}>
        <button className="ai-nav-btn" onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={idx === 0}>← Prev</button>
        <span style={{ fontSize: 14, color: "#888" }}>{idx + 1} / {cards.length}</span>
        <button className="ai-nav-btn" onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }} disabled={idx === cards.length - 1}>Next →</button>
      </div>
    </div>
  );
}

export default function AILearningPage() {
  const { profile } = useAuth();
  const username = profile?.name || "Learner";

  const [tab, setTab] = useState("explain");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [image, setImage] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);

  const handleRun = async () => {
    if (!input.trim()) return;
    if (tab === "image") { generateImage(); return; }
    setLoading(true); setOutput(null); setError(null); setFlashcards([]);
    try {
      const cfg = TAB_CONFIG[tab];
      const text = await groqChat(cfg.system, input);
      if (tab === "flashcard") setFlashcards(parseFlashcards(text));
      setOutput(text);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const downloadImage = async (url, i) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${input.trim()}-${i + 1}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const generateImage = async () => {
    if (!input.trim()) return;
    setImage(null); setImgLoading(true); setError(null);
    try {
      const query = encodeURIComponent(input.trim());
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrlimit=12&prop=pageimages&piprop=thumbnail&pithumbsize=400&format=json&origin=*`
      );
      const data = await res.json();
      const pages = Object.values(data.query?.pages || {});
      const urls = pages
        .filter(p => p.thumbnail?.source)
        .map(p => p.thumbnail.source)
        .slice(0, 6);
      if (urls.length === 0) throw new Error("No images found for this topic.");
      setImage(urls);
    } catch (e) {
      setError(e.message);
    }
    setImgLoading(false);
  };

  const cfg = TAB_CONFIG[tab];

  return (
    <div className="page-container">
      <div className="ai-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`ai-tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => { setTab(t.id); setInput(""); setOutput(null); setError(null); setFlashcards([]); setImage(null); }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="ai-tool-card">
        <h3>👋 Welcome, <span style={{ color: "var(--primary)" }}>{username}</span></h3>
        <textarea
          className="ai-textarea"
          placeholder={cfg.placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={4}
        />
        <button className="ai-run-btn" onClick={handleRun} disabled={loading || imgLoading}>
          {(loading || imgLoading) ? <><Loader size={16} className="spin" /> Fetching...</> : cfg.btn}
        </button>
        {error && <div className="error-msg" style={{ marginTop: 12 }}>❌ {error}</div>}
        {output && (
          <div className="ai-output">
            {tab === "flashcard"
              ? <FlashcardView cards={flashcards} />
              : <pre className="ai-pre">{output}</pre>
            }
          </div>
        )}
        {tab === "image" && image && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>🎨 Images for "{input}"</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {image.map((url, i) => (
                <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <img
                    src={url}
                    alt={`result-${i}`}
                    style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                    onError={e => { e.target.parentElement.style.display = "none"; }}
                  />
                  <button
                    onClick={() => downloadImage(url, i)}
                    style={{
                      position: "absolute", bottom: 6, right: 6,
                      background: "rgba(0,0,0,0.65)", color: "#fff",
                      border: "none", borderRadius: 6, padding: "4px 8px",
                      fontSize: 12, cursor: "pointer", backdropFilter: "blur(4px)"
                    }}
                  >⬇ Download</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
