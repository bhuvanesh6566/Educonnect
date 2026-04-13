import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC-2Dzd9mvsJbpz8_230qVzSiYxOmWU7M8",
  authDomain: "edtech-platform-e44d0.firebaseapp.com",
  projectId: "edtech-platform-e44d0",
  storageBucket: "edtech-platform-e44d0.firebasestorage.app",
  messagingSenderId: "424964409544",
  appId: "1:424964409544:web:1b2c219e296ad718837dfd",
  measurementId: "G-QEVYQ9JP4J",
  databaseURL: "https://edtech-platform-e44d0-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
