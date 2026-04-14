import { useEffect, useRef, useState } from "react";
import { useGroupChat, usePresence, useTyping, useOtherTyping } from "../hooks/useChat";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Send, Plus } from "lucide-react";

function formatTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Ticks({ status, isMine }) {
  if (!isMine) return null;
  if (!status || status === "sending") return <span className="tick">✓</span>;
  if (status === "sent") return <span className="tick tick-sent">✓✓</span>;
  return null;
}

export default function GroupChatPage() {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const { messages, send } = useGroupChat(selected?.id);
  const [text, setText] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const bottomRef = useRef();
  const typingTimeout = useRef();

  usePresence(user?.uid);
  const chatId = selected ? `group_${selected.id}` : null;
  const setTyping = useTyping(user?.uid, chatId);

  // collect typing users from group members (simplified: show if anyone is typing)
  const [typingUsers, setTypingUsers] = useState([]);

  const fetchGroups = () =>
    getDocs(collection(db, "groups")).then((snap) =>
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

  useEffect(() => { fetchGroups(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createGroup = async () => {
    if (!newGroup.trim()) return;
    await addDoc(collection(db, "groups"), { name: newGroup.trim(), createdAt: serverTimestamp() });
    setNewGroup("");
    fetchGroups();
  };

  const handleSend = async () => {
    if (!text.trim() || !selected) return;
    setTyping(false);
    await send(text.trim(), user.uid, profile?.name);
    setText("");
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    setTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(false), 1500);
  };

  const selectGroup = (g) => { setSelected(g); setShowChat(true); };

  return (
    <div className="chat-layout">
      <div className={`user-list ${showChat ? "mobile-hidden" : ""}`}>
        <h3>👥 Classrooms</h3>
        {profile?.role === "teacher" && (
          <div className="create-group">
            <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="New classroom name" />
            <button onClick={createGroup}><Plus size={16} /></button>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.id} className={`user-item ${selected?.id === g.id ? "active" : ""}`} onClick={() => selectGroup(g)}>
            <div className="avatar">🏫</div>
            <div className="user-name">{g.name}</div>
          </div>
        ))}
      </div>
      <div className={`chat-window ${!showChat ? "mobile-hidden" : ""}`}>
        {selected ? (
          <>
            <div className="chat-header">
              <button className="back-btn" onClick={() => setShowChat(false)}>←</button>
              <div className="avatar">🏫</div>
              <div>
                <strong>{selected.name}</strong>
                <div className="presence-status online">Group Chat</div>
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
              <input value={text} onChange={handleTyping} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Message classroom..." />
              <button onClick={handleSend}><Send size={18} /></button>
            </div>
          </>
        ) : (
          <div className="empty-chat">Select a classroom to join discussion</div>
        )}
      </div>
    </div>
  );
}
