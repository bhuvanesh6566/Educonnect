import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import {
  collection, getDocs, query, where, addDoc, serverTimestamp, getDoc, doc
} from "firebase/firestore";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function QuizAttemptPage() {
  const { quizId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      const quizSnap = await getDoc(doc(db, "quizzes", quizId));
      if (!quizSnap.exists()) { toast.error("Quiz not found"); navigate("/quiz"); return; }
      setQuiz({ id: quizSnap.id, ...quizSnap.data() });

      // Check if already submitted
      const doneSnap = await getDocs(query(collection(db, "results"),
        where("studentId", "==", user.uid), where("quizId", "==", quizId)));
      if (!doneSnap.empty) { setAlreadyDone(true); setLoading(false); return; }

      const qSnap = await getDocs(query(collection(db, "questions"), where("quizId", "==", quizId)));
      const fetched = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Shuffle questions uniquely per student using uid as seed
      const shuffle = (arr) => {
        const a = arr.map((item, i) => ({ item, sort: Math.random() + user.uid.charCodeAt(i % user.uid.length) }));
        a.sort((x, y) => x.sort - y.sort);
        return a.map(x => ({ ...x.item, options: [...x.item.options].sort(() => Math.random() - 0.5) }));
      };

      setQuestions(shuffle(fetched));
      setLoading(false);
    };
    load();
  }, [quizId]);

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length)
      return toast.error("Please answer all questions");

    setSubmitting(true);
    let score = 0;
    const details = questions.map((q, i) => {
      const selected = answers[i];
      const correct = selected === q.correctAnswer;
      if (correct) score++;
      return { questionText: q.questionText, selected, correctAnswer: q.correctAnswer, correct };
    });

    await addDoc(collection(db, "results"), {
      studentId: user.uid,
      quizId,
      score,
      totalQuestions: questions.length,
      submittedAt: serverTimestamp(),
    });

    setResult({ score, total: questions.length, details });
    setSubmitting(false);
  };

  if (loading) return <div className="page-container"><div className="empty-state">Loading quiz...</div></div>;

  if (alreadyDone) return (
    <div className="page-container">
      <div className="result-card">
        <div style={{ fontSize: "3rem" }}>✅</div>
        <h2>Already Completed</h2>
        <p style={{ color: "var(--text-muted)", margin: "0.5rem 0 1.5rem" }}>You have already submitted this quiz.</p>
        <button className="btn-primary" onClick={() => navigate("/quiz")}>
          <ArrowLeft size={16} /> Back to Quizzes
        </button>
      </div>
    </div>
  );

  // ── RESULT VIEW ──
  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="page-container">
        <div className="result-card">
          <h2>🎉 Quiz Result</h2>
          <div className="result-score">{result.score} / {result.total}</div>
          <div className="result-pct" style={{ color: pct >= 60 ? "#22c55e" : "#ef4444" }}>{pct}%</div>
          <div className="result-label">{pct >= 80 ? "Excellent! 🌟" : pct >= 60 ? "Good job! 👍" : "Keep practicing! 💪"}</div>

          <div style={{ marginTop: 20, textAlign: "left" }}>
            {result.details.map((d, i) => (
              <div key={i} className={`result-item ${d.correct ? "correct" : "wrong"}`}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {d.correct ? <CheckCircle size={18} color="#22c55e" /> : <XCircle size={18} color="#ef4444" />}
                  <div>
                    <div className="result-q">{d.questionText}</div>
                    <div className="result-ans">Your answer: <strong>{d.selected}</strong></div>
                    {!d.correct && <div className="result-correct">Correct: <strong>{d.correctAnswer}</strong></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/quiz")}>
            <ArrowLeft size={16} /> Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  // ── ATTEMPT VIEW ──
  return (
    <div className="page-container">
      <button className="btn-secondary" style={{ marginBottom: 12 }} onClick={() => navigate("/quiz")}>
        <ArrowLeft size={16} /> Back
      </button>
      <h2>📝 {quiz?.title}</h2>
      <div style={{ marginBottom: 16, color: "#888" }}>{questions.length} questions</div>

      {questions.map((q, i) => (
        <div key={q.id} className="question-block">
          <div className="question-text"><strong>Q{i + 1}.</strong> {q.questionText}</div>
          <div className="options-list">
            {q.options.map((opt, oi) => (
              <label key={oi} className={`option-label ${answers[i] === opt ? "selected" : ""}`}>
                <input type="radio" name={`q${i}`} value={opt}
                  checked={answers[i] === opt}
                  onChange={() => setAnswers(prev => ({ ...prev, [i]: opt }))} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      <button className="btn-primary" onClick={handleSubmit} disabled={submitting} style={{ marginTop: 8 }}>
        {submitting ? "Submitting..." : "Submit Quiz ✅"}
      </button>
    </div>
  );
}
