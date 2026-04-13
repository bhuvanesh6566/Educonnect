import { useState } from "react";
import { Loader, Map } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function groqChat(system, user) {
  const res = await fetch(`${API}/groq/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  return data.text;
}

const LEVELS = [
  {
    id: "beginner",
    label: "BEGINNER",
    color: "#22c55e",
    emoji: "🟢",
    system: "You are a teacher explaining to a complete beginner with no prior knowledge. Use very simple language, relatable analogies, and short sentences. Avoid jargon. Use bullet points.",
  },
  {
    id: "intermediate",
    label: "INTERMEDIATE",
    color: "#f59e0b",
    emoji: "🟡",
    system: "You are a teacher explaining to someone with basic knowledge. Use proper terminology, go deeper into concepts, include examples and use cases. Use bullet points.",
  },
  {
    id: "advanced",
    label: "ADVANCED",
    color: "#ef4444",
    emoji: "🔴",
    system: "You are a teacher explaining to an expert. Cover advanced theory, edge cases, internals, performance considerations, and real-world complexity. Use bullet points.",
  },
];

export default function AdaptiveLearningPage() {
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExplain = async () => {
    if (!topic.trim()) return;
    setLoading(true); setResults(null); setError(null);
    try {
      const [beginner, intermediate, advanced] = await Promise.all(
        LEVELS.map(l => groqChat(l.system, `Explain: ${topic}`))
      );
      setResults({ beginner, intermediate, advanced });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Map size={22} /> Adaptive Learning Path
      </h2>
      <p style={{ color: "#888", marginBottom: 16 }}>
        Enter any topic and get explanations tailored to all three learning levels.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleExplain()}
          placeholder="e.g., Recursion, Photosynthesis, Neural Networks..."
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 10,
            background: "var(--surface2)", border: "1px solid var(--border)",
            color: "var(--text)", fontSize: 15, outline: "none",
          }}
        />
        <button className="ai-run-btn" onClick={handleExplain} disabled={loading}>
          {loading ? <><Loader size={16} className="spin" /> Explaining...</> : "Explain All Levels"}
        </button>
      </div>

      {error && <div className="error-msg">❌ {error}</div>}

      {results && (
        <div className="path-steps">
          {LEVELS.map(l => (
            <div key={l.id} className="path-section" style={{ borderColor: l.color }}>
              <h4 style={{ color: l.color, marginBottom: 12 }}>{l.emoji} {l.label}</h4>
              <pre className="ai-pre" style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0 }}>
                {results[l.id]}
              </pre>
            </div>
          ))}
        </div>
      )}

      {!results && !loading && (
        <div className="path-steps">
          {LEVELS.map(l => (
            <div key={l.id} className="path-section" style={{ borderColor: l.color, opacity: 0.4 }}>
              <h4 style={{ color: l.color }}>{l.emoji} {l.label}</h4>
              <p style={{ color: "#666", fontSize: 13 }}>Explanation will appear here...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
