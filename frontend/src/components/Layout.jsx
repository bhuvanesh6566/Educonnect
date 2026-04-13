import { useAuth } from "../context/AuthContext";
import { useNotifications, useQuizNotifications } from "../hooks/useChat";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Video, VideoOff, MessageCircle, Users, Bell, Bot, TrendingUp, Map, Globe, LogOut, ClipboardList } from "lucide-react";
import VoiceAssistant from "./VoiceAssistant";

const navItems = [
  { to: "/live", icon: <Video size={18} />, label: "Live Class" },
  { to: "/chat", icon: <MessageCircle size={18} />, label: "1-on-1 Chat" },
  { to: "/group", icon: <Users size={18} />, label: "Classrooms" },
  { to: "/notifications", icon: <Bell size={18} />, label: "Notifications" },
  { to: "/ai", icon: <Bot size={18} />, label: "AI Learning" },
  { to: "/adaptive", icon: <Map size={18} />, label: "Learning Path" },
  { to: "/skills", icon: <TrendingUp size={18} />, label: "Skill Tracker" },
  { to: "/accessibility", icon: <Globe size={18} />, label: "Accessibility" },
  { to: "/quiz", icon: <ClipboardList size={18} />, label: "Quiz" },
];

export default function Layout() {
  const { user, profile, logout } = useAuth();
  const notifications = useNotifications(user?.uid);
  const quizNotifs = useQuizNotifications(user?.uid);
  const unread = notifications.filter((n) => !n.read).length + quizNotifs.filter((n) => !n.read).length;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🎓 EduConnect</div>
        <div className="sidebar-profile">
          <div className="avatar large">{profile?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="profile-name">{profile?.name}</div>
            <div className="profile-role">{profile?.role}</div>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              {item.icon}
              <span>{item.label}</span>
              {item.to === "/notifications" && unread > 0 && <span className="badge">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={handleLogout}><LogOut size={16} /> Logout</button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
      <VoiceAssistant />
    </div>
  );
}
