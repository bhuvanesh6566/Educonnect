import { Globe } from "lucide-react";

const features = [
  { icon: "🔤", title: "Multi-language Support", desc: "Interface available in multiple languages for diverse learners." },
  { icon: "🎙️", title: "Voice Assistance", desc: "Voice-enabled navigation for accessibility." },
  { icon: "🌗", title: "High Contrast Mode", desc: "Optimized for visually impaired users." },
  { icon: "📱", title: "Mobile Friendly", desc: "Fully responsive on all devices." },
  { icon: "🐢", title: "Self-paced Learning", desc: "No deadlines — learn at your own speed." },
  { icon: "🌍", title: "Global Access", desc: "Available anywhere with internet access." },
];

export default function AccessibilityPage() {
  return (
    <div className="page-container">
      <h2><Globe size={22} /> Accessibility & Inclusivity</h2>
      <p className="page-subtitle">EduConnect is built for everyone, regardless of background or ability.</p>
      <div className="feature-grid">
        {features.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
