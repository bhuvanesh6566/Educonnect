import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";

export default function SkillTrackingPage() {
  const { user, profile } = useAuth();
  const isTeacher = profile?.role === "teacher";
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (isTeacher) loadTeacherView();
    else loadFromQuizResults();
  }, [user]);

  // ── STUDENT: derive scores from quiz results ──
  const loadFromQuizResults = async () => {
    const resultsSnap = await getDocs(
      query(collection(db, "results"), where("studentId", "==", user.uid))
    );
    if (resultsSnap.empty) { setSkills([]); setLoading(false); return; }

    // Group scores by subjectId
    const subjectMap = {}; // { subjectId: { total: n, count: n } }

    await Promise.all(resultsSnap.docs.map(async d => {
      const r = d.data();
      const pct = Math.round((r.score / r.totalQuestions) * 100);
      const quizSnap = await getDoc(doc(db, "quizzes", r.quizId));
      if (!quizSnap.exists()) return;
      const subjectId = quizSnap.data().subjectId;
      if (!subjectMap[subjectId]) subjectMap[subjectId] = { total: 0, count: 0 };
      subjectMap[subjectId].total += pct;
      subjectMap[subjectId].count += 1;
    }));

    // Fetch subject names
    const skillList = await Promise.all(
      Object.entries(subjectMap).map(async ([subjectId, { total, count }]) => {
        const subSnap = await getDoc(doc(db, "subjects", subjectId));
        const name = subSnap.exists() ? subSnap.data().name : subjectId;
        const score = Math.round(total / count);
        return { subject: name, score };
      })
    );

    skillList.sort((a, b) => a.subject.localeCompare(b.subject));
    setSkills(skillList);

    // Persist to skills collection
    await setDoc(doc(db, "skills", user.uid), { skills: skillList });
    setLoading(false);
  };

  // ── TEACHER: just read saved skills (no quiz results) ──
  const loadTeacherView = async () => {
    const snap = await getDoc(doc(db, "skills", user.uid));
    if (snap.exists()) setSkills(snap.data().skills);
    setLoading(false);
  };

  const weak = skills.filter(s => s.score < 50);
  const strong = skills.filter(s => s.score >= 75);

  if (loading) return <div className="page-container"><div className="empty-state">Loading skills...</div></div>;

  if (skills.length === 0) return (
    <div className="page-container">
      <h2><TrendingUp size={22} /> Skill Tracking</h2>
      <div className="empty-state" style={{ marginTop: 40 }}>
        📝 No quiz results yet. Attempt some quizzes to see your skill dashboard!
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <h2><TrendingUp size={22} /> Skill Tracking</h2>
      <p className="page-subtitle" style={{ marginBottom: 16, fontSize: "0.85rem", color: "var(--text-muted)" }}>
        📊 Scores calculated from your quiz results
      </p>

      <div className="skill-grid">
        <div className="chart-card">
          <h4>Radar Overview</h4>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={skills}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h4>Bar Chart</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={skills}>
              <XAxis dataKey="subject" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="skill-scores">
        {skills.map(s => (
          <div key={s.subject} className="skill-row">
            <span>{s.subject}</span>
            <div className="progress-bar">
              <div style={{ width: `${s.score}%` }}
                className={s.score < 50 ? "low" : s.score < 75 ? "mid" : "high"} />
            </div>
            <span className="score-label">{s.score}%</span>
          </div>
        ))}
      </div>

      <div className="skill-insights">
        {weak.length > 0 && <div className="insight weak">⚠️ Needs work: {weak.map(s => s.subject).join(", ")}</div>}
        {strong.length > 0 && <div className="insight strong">🌟 Strong in: {strong.map(s => s.subject).join(", ")}</div>}
      </div>
    </div>
  );
}
