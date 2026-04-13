import { useEffect, useRef, useState } from "react";
import { useGroupChat } from "../hooks/useChat";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Send, Plus } from "lucide-react";

export default function GroupChatPage() {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const { messages, send } = useGroupChat(selected?.id);
  const [text, setText] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const bottomRef = useRef();

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
    await send(text.trim(), user.uid, profile?.name);
    setText("");
  };

  return (
    <div className="chat-layout">
      <div className="user-list">
        <h3>👥 Classrooms</h3>
        {profile?.role === "teacher" && (
          <div className="create-group">
            <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="New classroom name" />
            <button onClick={createGroup}><Plus size={16} /></button>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.id} className={`user-item ${selected?.id === g.id ? "active" : ""}`} onClick={() => setSelected(g)}>
            <div className="avatar">🏫</div>
            <div className="user-name">{g.name}</div>
          </div>
        ))}
      </div>
      <div className="chat-window">
        {selected ? (
          <>
            <div className="chat-header"><strong>🏫 {selected.name}</strong></div>
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
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Message classroom..." />
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
