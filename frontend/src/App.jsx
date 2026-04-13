import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import Layout from "./components/Layout";
import ChatPage from "./pages/ChatPage";
import GroupChatPage from "./pages/GroupChatPage";
import NotificationsPage from "./pages/NotificationsPage";
import AILearningPage from "./pages/AILearningPage";
import AdaptiveLearningPage from "./pages/AdaptiveLearningPage";
import SkillTrackingPage from "./pages/SkillTrackingPage";
import AccessibilityPage from "./pages/AccessibilityPage";
import LiveClassPage from "./pages/LiveClassPage";
import QuizPage from "./pages/QuizPage";
import QuizAttemptPage from "./pages/QuizAttemptPage";

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/chat" /> : <AuthPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="chat" element={<ChatPage />} />
        <Route path="group" element={<GroupChatPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="ai" element={<AILearningPage />} />
        <Route path="adaptive" element={<AdaptiveLearningPage />} />
        <Route path="skills" element={<SkillTrackingPage />} />
        <Route path="accessibility" element={<AccessibilityPage />} />
        <Route path="live" element={<LiveClassPage />} />
        <Route path="quiz" element={<QuizPage />} />
        <Route path="quiz/:quizId" element={<QuizAttemptPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
