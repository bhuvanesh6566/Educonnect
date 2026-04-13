import { useEffect, useState } from "react";
import { db, rtdb } from "../firebase/config";
import { ref, onValue, push, serverTimestamp as rtServerTimestamp } from "firebase/database";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from "firebase/firestore";

export function usePrivateChat(myUid, otherUid) {
  const [messages, setMessages] = useState([]);
  const chatId = [myUid, otherUid].sort().join("_");

  useEffect(() => {
    if (!myUid || !otherUid) return;
    const q = query(
      collection(db, "privateChats", chatId, "messages"),
      orderBy("createdAt")
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [chatId, myUid, otherUid]);

  const send = (text, senderName) =>
    addDoc(collection(db, "privateChats", chatId, "messages"), {
      text,
      senderUid: myUid,
      senderName,
      createdAt: serverTimestamp(),
    });

  return { messages, send };
}

export function useGroupChat(groupId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!groupId) return;
    const q = query(
      collection(db, "groups", groupId, "messages"),
      orderBy("createdAt")
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [groupId]);

  const send = (text, senderUid, senderName) =>
    addDoc(collection(db, "groups", groupId, "messages"), {
      text,
      senderUid,
      senderName,
      createdAt: serverTimestamp(),
    });

  return { messages, send };
}

export function useNotifications(uid) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const notifRef = ref(rtdb, `notifications/${uid}`);
    return onValue(notifRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setNotifications(list.reverse());
      } else {
        setNotifications([]);
      }
    });
  }, [uid]);

  return notifications;
}

export function useQuizNotifications(uid) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [uid]);

  return notifications;
}
