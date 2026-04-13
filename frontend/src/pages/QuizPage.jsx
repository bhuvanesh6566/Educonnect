import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import {
  collection, addDoc, getDocs, query, where, serverTimestamp, doc, getDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { BookOpen, Plus, Trash2, Send, ClipboardList } from "lucide-react";
import toast from "react-hot-toast";

const emptyQuestion = () => ({ questionText: "", options: ["", "", "", ""], correctAnswer: "" });

export default function QuizPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isTeacher = profile?.role === "teacher";

  // Teacher state
  const [subjects, setSubjects] = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [publishing, setPublishing] = useState(false);

  // Student state
  const [quizzes, setQuizzes] = useState([]);
  const [completedIds, setCompletedIds] = useState(new Set());

  useEffect(() => {
    if (isTeacher) loadSubjects();
    else loadStudentQuizzes();
  }, [isTeacher]);

  const loadSubjects = async () => {
    const snap = await getDocs(query(collection(db, "subjects"), where("teacherId", "==", user.uid)));
    setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const loadStudentQuizzes = async () => {
    const snap = await getDocs(collection(db, "quizzes"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const withSubject = await Promise.all(list.map(async q => {
      const subSnap = await getDoc(doc(db, "subjects", q.subjectId));
      return { ...q, subjectName: subSnap.exists() ? subSnap.data().name : "Unknown" };
    }));
    setQuizzes(withSubject);

    // Check which quizzes this student already submitted
    const resultsSnap = await getDocs(query(collection(db, "results"), where("studentId", "==", user.uid)));
    setCompletedIds(new Set(resultsSnap.docs.map(d => d.data().quizId)));
  };

  const handleAddSubject = async () => {
    if (!subjectName.trim()) return;
    const ref = await addDoc(collection(db, "subjects"), { name: subjectName.trim(), teacherId: user.uid });
    setSubjects(prev => [...prev, { id: ref.id, name: subjectName.trim(), teacherId: user.uid }]);
    setSubjectName("");
    toast.success("Subject added!");
  };

  const updateQuestion = (i, field, value) => {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };

  const updateOption = (qi, oi, value) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      const opts = [...q.options];
      opts[oi] = value;
      return { ...q, options: opts };
    }));
  };

  const handlePublish = async () => {
    if (!selectedSubject || !quizTitle.trim()) return toast.error("Select subject and enter title");
    if (questions.some(q => !q.questionText.trim() || !q.correctAnswer || q.options.some(o => !o.trim())))
      return toast.error("Fill all question fields");

    setPublishing(true);
    try {
      const quizRef = await addDoc(collection(db, "quizzes"), {
        subjectId: selectedSubject,
        title: quizTitle.trim(),
        teacherId: user.uid,
        createdAt: serverTimestamp(),
      });

      await Promise.all(questions.map(q =>
        addDoc(collection(db, "questions"), { quizId: quizRef.id, ...q })
      ));

      // Notify all students
      const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
      await Promise.all(usersSnap.docs.map(d =>
        addDoc(collection(db, "notifications"), {
          userId: d.id,
          message: `New quiz available: ${quizTitle.trim()}`,
          quizId: quizRef.id,
          type: "quiz",
          read: false,
          createdAt: serverTimestamp(),
        })
      ));

      toast.success("Quiz published & students notified!");
      setQuizTitle(""); setSelectedSubject(""); setQuestions([emptyQuestion()]);
    } finally {
      setPublishing(false);
    }
  };

  // ── STUDENT VIEW ──
  if (!isTeacher) return (
    <div className="page-container">
      <h2><ClipboardList size={22} /> Available Quizzes</h2>
      {quizzes.length === 0 ? (
        <div className="empty-state">No quizzes available yet</div>
      ) : (
        <div className="quiz-list">
          {quizzes.map(q => {
            const done = completedIds.has(q.id);
            return (
              <div key={q.id} className={`quiz-card ${done ? "quiz-card-done" : ""}`}
                onClick={() => !done && navigate(`/quiz/${q.id}`)}
                style={{ cursor: done ? "default" : "pointer" }}>
                <div className="quiz-card-title">{q.title}</div>
                <div className="quiz-card-sub">📚 {q.subjectName}</div>
                {done
                  ? <div className="quiz-done-badge">✅ Completed</div>
                  : <button className="btn-primary" style={{ marginTop: 8 }}>Attempt Quiz →</button>
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── TEACHER VIEW ──
  return (
    <div className="page-container">
      <h2><BookOpen size={22} /> Quiz Manager</h2>

      {/* Add Subject */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Add Subject</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" placeholder="Subject name" value={subjectName}
            onChange={e => setSubjectName(e.target.value)} />
          <button className="btn-primary" onClick={handleAddSubject}><Plus size={16} /> Add</button>
        </div>
        {subjects.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {subjects.map(s => <span key={s.id} className="badge-tag">📚 {s.name}</span>)}
          </div>
        )}
      </div>

      {/* Create Quiz */}
      <div className="card">
        <h3>Create Quiz</h3>
        <select className="input" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
          <option value="">-- Select Subject --</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="input" placeholder="Quiz title" value={quizTitle}
          onChange={e => setQuizTitle(e.target.value)} style={{ marginTop: 8 }} />

        <h4 style={{ marginTop: 16 }}>Questions</h4>
        {questions.map((q, qi) => (
          <div key={qi} className="question-block">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Q{qi + 1}</strong>
              {questions.length > 1 && (
                <button className="btn-danger-sm" onClick={() => setQuestions(prev => prev.filter((_, i) => i !== qi))}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <input className="input" placeholder="Question text" value={q.questionText}
              onChange={e => updateQuestion(qi, "questionText", e.target.value)} />
            <div className="options-grid">
              {q.options.map((opt, oi) => (
                <input key={oi} className="input" placeholder={`Option ${oi + 1}`} value={opt}
                  onChange={e => updateOption(qi, oi, e.target.value)} />
              ))}
            </div>
            <select className="input" value={q.correctAnswer}
              onChange={e => updateQuestion(qi, "correctAnswer", e.target.value)}>
              <option value="">-- Correct Answer --</option>
              {q.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
            </select>
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn-secondary" onClick={() => setQuestions(prev => [...prev, emptyQuestion()])}>
            <Plus size={16} /> Add Question
          </button>
          <button className="btn-primary" onClick={handlePublish} disabled={publishing}>
            <Send size={16} /> {publishing ? "Publishing..." : "Publish Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
