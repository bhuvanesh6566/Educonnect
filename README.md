# EduConnect — Full Stack Education Platform

## Tech Stack
- **Frontend**: React + Vite + Firebase SDK
- **Backend**: Python FastAPI
- **Database**: Firebase Firestore + Realtime Database

---

## Project Structure
```
srm_vs/
├── frontend/          # React app
│   └── src/
│       ├── firebase/config.js       # Firebase init
│       ├── context/AuthContext.jsx  # Auth state
│       ├── hooks/useChat.js         # Chat + notifications hooks
│       ├── components/Layout.jsx    # Sidebar layout
│       └── pages/
│           ├── AuthPage.jsx
│           ├── ChatPage.jsx          # 1-on-1 chat
│           ├── GroupChatPage.jsx     # Classroom chat
│           ├── NotificationsPage.jsx
│           ├── AILearningPage.jsx    # AI recommendations
│           ├── AdaptiveLearningPage.jsx
│           ├── SkillTrackingPage.jsx
│           └── AccessibilityPage.jsx
└── backend/           # FastAPI app
    └── app/
        ├── main.py
        ├── firebase_admin_config.py
        └── routers/
            ├── ai_learning.py       # AI recommendations
            └── notifications.py     # Push notifications
```

---

## Setup

### 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → Enable **Authentication** (Email/Password)
3. Enable **Firestore Database**
4. Enable **Realtime Database**
5. Copy your web config into `frontend/src/firebase/config.js`
6. Download `serviceAccountKey.json` (Project Settings → Service Accounts) → place in `backend/`
7. Update `databaseURL` in `backend/app/firebase_admin_config.py`

### Firestore Rules (paste in Firebase Console)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /privateChats/{chatId}/messages/{msgId} {
      allow read, write: if request.auth != null;
    }
    match /groups/{groupId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      match /messages/{msgId} {
        allow read, write: if request.auth != null;
      }
    }
    match /skills/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /learningPaths/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

### Realtime Database Rules
```json
{
  "rules": {
    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null"
      }
    }
  }
}
```

---

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## Features
| Feature | Implementation |
|---|---|
| 1-on-1 Chat | Firestore real-time |
| Group/Classroom Chat | Firestore real-time |
| Notifications | Firebase Realtime DB |
| AI Learning | FastAPI rule-based engine |
| Adaptive Learning Path | Firestore + auto level-up |
| Skill Tracking | Firestore + Recharts |
| Accessibility | Info page + responsive UI |
