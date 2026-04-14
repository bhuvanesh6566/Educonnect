import { useEffect, useRef, useState } from "react";
import { usePrivateChat } from "../hooks/useChat";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { Send } from "lucide-react";

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const { messages, send } = usePrivateChat(user?.uid, selected?.uid);
  const [text, setText] = useState("");
  const bottomRef = useRef();

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
    await send(text.trim(), profile?.name);
    setText("");
  };

  const selectUser = (u) => { setSelected(u); setShowChat(true); };

  return (
    <div className="chat-layout">
      <div className={`user-list ${showChat ? "mobile-hidden" : ""}`}>
        <h3>💬 Contacts</h3>
        {users.map((u) => (
          <div key={u.uid} className={`user-item ${selected?.uid === u.uid ? "active" : ""}`} onClick={() => selectUser(u)}>
            <div className="avatar">{u.name[0].toUpperCase()}</div>
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
                <span className="user-role"> · {selected.role}</span>
              </div>
            </div>
            <div className="messages">
              {messages.map((m) => (
                <div key={m.id} className={`message ${m.senderUid === user.uid ? "mine" : "theirs"}`}>
                  <div className="bubble">{m.text}</div>
                  <div className="msg-name">{m.senderName}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="input-row">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type a message..." />
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
