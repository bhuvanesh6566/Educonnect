import { useEffect, useRef, useState } from "react";
import { usePrivateChat, usePresence, useUserPresence, useTyping, useOtherTyping } from "../hooks/useChat";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { Send } from "lucide-react";

function formatTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Ticks({ status, isMine }) {
  if (!isMine) return null;
  if (!status || status === "sending") return <span className="tick">✓</span>;
  if (status === "sent") return <span className="tick tick-sent">✓✓</span>;
  if (status === "read") return <span className="tick tick-read">✓✓</span>;
  return null;
}

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const { messages, send, chatId } = usePrivateChat(user?.uid, selected?.uid);
  const [text, setText] = useState("");
  const bottomRef = useRef();
  const typingTimeout = useRef();

  usePresence(user?.uid);
  const otherStatus = useUserPresence(selected?.uid);
  const setTyping = useTyping(user?.uid, chatId);
  const otherTyping = useOtherTyping(selected?.uid, chatId);

  useEffect(() => {
    getDocs(collection(db, "users")).then((snap) => {
      setUsers(snap.docs.map((d) => d.data()).filter((u) => u.uid !== user?.uid));
    });
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !selected) return;
    setTyping(false);
    await send(text.trim(), profile?.name);
    setText("");
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    setTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(false), 1500);
  };

  const selectUser = (u) => { setSelected(u); setShowChat(true); };

  const statusLabel = selected
    ? otherTyping
      ? "typing..."
      : otherStatus.online
      ? "online"
      : "offline"
    : "";

  return (
    <div className="chat-layout">
      <div className={`user-list ${showChat ? "mobile-hidden" : ""}`}>
        <h3>💬 Contacts</h3>
        {users.map((u) => (
          <div key={u.uid} className={`user-item ${selected?.uid === u.uid ? "active" : ""}`} onClick={() => selectUser(u)}>
            <div className="avatar-wrap">
              <div className="avatar">{u.name[0].toUpperCase()}</div>
            </div>
            <div>
              <div className="user-name">{u.name}</div>
              <div className="user-role">{u.role}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={`chat-window ${!showChat ? "mobile-hidden" : ""}`}>
        {selected ? (
          <>
            <div className="chat-header">
              <button className="back-btn" onClick={() => setShowChat(false)}>←</button>
              <div className="avatar">{selected.name[0].toUpperCase()}</div>
              <div>
                <strong>{selected.name}</strong>
                <div className={`presence-status ${otherTyping ? "typing" : otherStatus.online ? "online" : "offline"}`}>
                  {statusLabel}
                </div>
              </div>
            </div>
            <div className="messages">
              {messages.map((m) => (
                <div key={m.id} className={`message ${m.senderUid === user.uid ? "mine" : "theirs"}`}>
                  <div className="bubble">{m.text}</div>
                  <div className="msg-meta">
                    <span className="msg-name">{m.senderName}</span>
                    <span className="msg-time">{formatTime(m.createdAt)}</span>
                    <Ticks status={m.status} isMine={m.senderUid === user.uid} />
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="input-row">
              <input value={text} onChange={handleTyping} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type a message..." />
              <button onClick={handleSend}><Send size={18} /></button>
            </div>
          </>
        ) : (
          <div className="empty-chat">Select a contact to start chatting</div>
        )}
      </div>
    </div>
  );
}
