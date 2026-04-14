import { useEffect, useState } from "react";
import { db, rtdb } from "../firebase/config";
import { ref, onValue, push, set, serverTimestamp as rtServerTimestamp } from "firebase/database";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, writeBatch, doc } from "firebase/firestore";

export function usePresence(myUid) {
  useEffect(() => {
    if (!myUid) return;
    const onlineRef = ref(rtdb, `presence/${myUid}/online`);
    set(onlineRef, true);
    return () => set(onlineRef, false);
  }, [myUid]);
}

export function useUserPresence(uid) {
  const [status, setStatus] = useState({ online: false, typing: false });
  useEffect(() => {
    if (!uid) return;
    return onValue(ref(rtdb, `presence/${uid}`), (snap) => {
      setStatus(snap.val() || { online: false, typing: false });
    });
  }, [uid]);
  return status;
}

export function useTyping(myUid, chatId) {
  const setTyping = (val) => {
    if (!myUid || !chatId) return;
    set(ref(rtdb, `presence/${myUid}/typing_${chatId}`), val);
  };
  return setTyping;
}

export function useOtherTyping(otherUid, chatId) {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!otherUid || !chatId) return;
    return onValue(ref(rtdb, `presence/${otherUid}/typing_${chatId}`), (snap) => {
      setTyping(!!snap.val());
    });
  }, [otherUid, chatId]);
  return typing;
}

export function usePrivateChat(myUid, otherUid) {
  const [messages, setMessages] = useState([]);
  const chatId = myUid && otherUid ? [myUid, otherUid].sort().join("_") : null;

  useEffect(() => {
    if (!myUid || !otherUid || !chatId) return;
    const q = query(
      collection(db, "privateChats", chatId, "messages"),
      orderBy("createdAt")
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      // mark unread messages from other as read
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        if (d.data().senderUid !== myUid && d.data().status !== "read") {
          batch.update(doc(db, "privateChats", chatId, "messages", d.id), { status: "read" });
        }
      });
      batch.commit();
    });
  }, [chatId, myUid, otherUid]);

  const send = (text, senderName) =>
    addDoc(collection(db, "privateChats", chatId, "messages"), {
      text, senderUid: myUid, senderName,
      createdAt: serverTimestamp(),
      status: "sent",
    });

  return { messages, send, chatId };
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
      text, senderUid, senderName,
      createdAt: serverTimestamp(),
      status: "sent",
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
