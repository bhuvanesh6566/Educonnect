import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import { Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Users } from "lucide-react";

const SIGNALING = import.meta.env.VITE_SIGNALING_URL || "http://localhost:3001";
const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function LiveClassPage() {
  const { user, profile } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [peers, setPeers] = useState({}); // { socketId: { stream, userName, role } }
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [notification, setNotification] = useState("");

  const socketRef = useRef();
  const localStreamRef = useRef();
  const screenStreamRef = useRef();
  const pcsRef = useRef({}); // { socketId: RTCPeerConnection }
  const localVideoRef = useRef();

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3000); };

  const createPC = useCallback((peerId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current.emit("ice-candidate", { to: peerId, candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      setPeers((prev) => ({ ...prev, [peerId]: { ...prev[peerId], stream: e.streams[0] } }));
    };

    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    pcsRef.current[peerId] = pc;
    return pc;
  }, []);

  const joinRoom = async () => {
    if (!roomId.trim()) return;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      try {
        // Camera in use or no camera — join with audio only
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        notify("⚠️ Camera unavailable — joined with audio only");
      } catch {
        // No devices at all — join silently
        stream = new MediaStream();
        notify("⚠️ No camera/mic found — joined in view-only mode");
      }
    }
    localStreamRef.current = stream;
    const socket = io(SIGNALING);
    socketRef.current = socket;

    socket.emit("join-room", { roomId, userName: profile?.name, role: profile?.role });

    socket.on("existing-peers", (existingPeers) => {
      existingPeers.forEach(async ({ id, userName, role }) => {
        setPeers((prev) => ({ ...prev, [id]: { userName, role } }));
        const pc = createPC(id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { to: id, offer });
      });
    });

    socket.on("user-joined", ({ id, userName, role }) => {
      setPeers((prev) => ({ ...prev, [id]: { userName, role } }));
      notify(`${userName} joined`);
    });

    socket.on("offer", async ({ from, offer, userName }) => {
      const pc = createPC(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { to: from, answer });
    });

    socket.on("answer", async ({ from, answer }) => {
      await pcsRef.current[from]?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      await pcsRef.current[from]?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("user-left", ({ id, userName }) => {
      pcsRef.current[id]?.close();
      delete pcsRef.current[id];
      setPeers((prev) => { const n = { ...prev }; delete n[id]; return n; });
      notify(`${userName} left`);
    });

    socket.on("screen-share", ({ userName, sharing }) => {
      notify(`${userName} ${sharing ? "started" : "stopped"} screen sharing`);
    });

    setJoined(true);
  };

  // Attach local stream after video element mounts (after setJoined(true))
  useEffect(() => {
    if (joined && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [joined]);

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    setCamOn(!camOn);
  };

  const startScreenShare = async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = screen;
      const track = screen.getVideoTracks()[0];
      Object.values(pcsRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        sender?.replaceTrack(track);
      });
      socketRef.current.emit("screen-share", { roomId, sharing: true });
      setSharing(true);
      track.onended = stopScreenShare;
    } catch {}
  };

  const stopScreenShare = async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    Object.values(pcsRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (camTrack) sender?.replaceTrack(camTrack);
    });
    socketRef.current.emit("screen-share", { roomId, sharing: false });
    setSharing(false);
  };

  const leaveRoom = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(pcsRef.current).forEach((pc) => pc.close());
    pcsRef.current = {};
    socketRef.current?.disconnect();
    setPeers({});
    setJoined(false);
    setSharing(false);
  };

  useEffect(() => () => leaveRoom(), []);

  if (!joined) {
    return (
      <div className="page-container">
        <h2><Video size={22} /> Live Class</h2>
        <div className="join-card">
          <p>Enter a Room ID to start or join a live class session.</p>
          <div className="join-form">
            <input placeholder="Room ID (e.g. math-101)" value={roomId} onChange={(e) => setRoomId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && joinRoom()} />
            <button onClick={joinRoom}>
              {profile?.role === "teacher" ? "Start Class" : "Join Class"}
            </button>
          </div>
          <div className="join-hint">
            {profile?.role === "teacher" ? "🎓 Share the Room ID with your students" : "📚 Ask your teacher for the Room ID"}
          </div>
        </div>
      </div>
    );
  }

  const peerList = Object.entries(peers);

  return (
    <div className="live-page">
      {notification && <div className="live-notif">{notification}</div>}

      <div className="live-header">
        <span>🔴 Live — Room: <strong>{roomId}</strong></span>
        <span className="peer-count"><Users size={14} /> {peerList.length + 1} participants</span>
      </div>

      <div className={`video-grid grid-${Math.min(peerList.length + 1, 4)}`}>
        {/* Local video */}
        <div className="video-tile">
          <video ref={localVideoRef} autoPlay muted playsInline className="video-el" />
          <div className="video-label">
            {profile?.name} (You) · {profile?.role}
            {!micOn && <MicOff size={12} />}
            {!camOn && <VideoOff size={12} />}
          </div>
        </div>

        {/* Remote peers */}
        {peerList.map(([id, peer]) => (
          <RemoteVideo key={id} stream={peer.stream} userName={peer.userName} role={peer.role} />
        ))}
      </div>

      <div className="live-controls">
        <button className={`ctrl-btn ${!micOn ? "off" : ""}`} onClick={toggleMic} title={micOn ? "Mute" : "Unmute"}>
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button className={`ctrl-btn ${!camOn ? "off" : ""}`} onClick={toggleCam} title={camOn ? "Stop Camera" : "Start Camera"}>
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        <button className={`ctrl-btn ${sharing ? "active" : ""}`} onClick={sharing ? stopScreenShare : startScreenShare} title="Screen Share">
          <Monitor size={20} />
        </button>
        <button className="ctrl-btn end" onClick={leaveRoom} title="Leave">
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}

function RemoteVideo({ stream, userName, role }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="video-tile">
      <video ref={ref} autoPlay playsInline className="video-el" />
      <div className="video-label">{userName} · {role}</div>
    </div>
  );
}
