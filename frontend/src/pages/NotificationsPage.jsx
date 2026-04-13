import { useNotifications, useQuizNotifications } from "../hooks/useChat";
import { useAuth } from "../context/AuthContext";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase/config";
import { useEffect } from "react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const rtdbNotifs = useNotifications(user?.uid);
  const quizNotifs = useQuizNotifications(user?.uid);
  const navigate = useNavigate();

  const typeIcon = { assignment: "📝", message: "💬", live: "🔴", progress: "📈", quiz: "📋" };

  const notifications = [...quizNotifs, ...rtdbNotifs];

  // Auto-mark all unread quiz notifications as read when page opens
  useEffect(() => {
    const unread = quizNotifs.filter(n => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, "notifications", n.id), { read: true }));
    batch.commit();
  }, [quizNotifs.length]);

  const handleClick = (n) => {
    if (n.type === "quiz" && n.quizId) navigate(`/quiz/${n.quizId}`);
  };

  return (
    <div className="page-container">
      <h2><Bell size={22} /> Notifications</h2>
      {notifications.length === 0 ? (
        <div className="empty-state">No notifications yet</div>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => (
            <div key={n.id} className="notif-card"
              onClick={() => handleClick(n)}
              style={{ cursor: n.type === "quiz" ? "pointer" : "default" }}>
              <span className="notif-icon">{typeIcon[n.type] || "🔔"}</span>
              <div>
                <div className="notif-title">{n.title || n.message}</div>
                <div className="notif-body">{n.body}</div>
                <div className="notif-time">
                  {n.timestamp ? new Date(n.timestamp).toLocaleString()
                    : n.createdAt?.toDate?.()?.toLocaleString?.() || ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
