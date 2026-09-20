// ============================================================================
// Firebase V9 Modular Initialization & Configuration
// Smart Classroom QR Attendance System
// ============================================================================

import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  child, 
  push, 
  update, 
  onValue, 
  query, 
  orderByChild, 
  equalTo,
  remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// [PROJECT 1: QR ATTENDANCE CONFIGURATION]
export const firebaseConfig = {
  apiKey: "AIzaSyBDNgcERw281tizuvx8fD4NB4p1UOMkRZ8",
  authDomain: "smart-classroom-qr.firebaseapp.com",
  databaseURL: "https://smart-classroom-qr-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-classroom-qr",
  storageBucket: "smart-classroom-qr.firebasestorage.app",
  messagingSenderId: "561775689474",
  appId: "1:561775689474:web:9a4907149e6be469d9cc1b",
  measurementId: "G-T5GMXMD80L"
};

// [PROJECT 2: CLASSROOM CONFIGURATION - Single Source of Truth for Students]
export const classroomFirebaseConfig = {
  apiKey: "AIzaSyBSzuUeBGUXnz8xvGF3TnRr_8ssvwYxU2A",
  authDomain: "smart-classroom-6c776.firebaseapp.com",
  databaseURL: "https://smart-classroom-6c776-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-classroom-6c776",
  storageBucket: "smart-classroom-6c776.firebasestorage.app",
  messagingSenderId: "501892811986",
  appId: "1:501892811986:web:2b3c75612e64650dd3310b",
  measurementId: "G-C03W6RMNC2"
};

// Teacher emails allowed to access Teacher Dashboard (admin.html)
export const ALLOWED_TEACHER_EMAILS = [
  "chavanvit.si9@gmail.com",
  "teacher@example.com"
];

// Initialize Primary Firebase Services (Attendance & Teacher Auth)
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Classroom Database (Shared Student Roster & PIN)
export const classroomApp = initializeApp(classroomFirebaseConfig, "classroomApp");
export const classroomDb = getDatabase(classroomApp);

// Re-export Modular Auth Functions
export {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile
};

// Re-export Modular Database Functions
export {
  ref,
  set,
  get,
  child,
  push,
  update,
  onValue,
  query,
  orderByChild,
  equalTo,
  remove
};

/**
 * Checks if a given user or email belongs to an authorized teacher.
 * Strictly verifies email against ALLOWED_TEACHER_EMAILS.
 */
export function isTeacherUser(userOrEmail) {
  if (!userOrEmail) return false;
  let email = "";
  
  if (typeof userOrEmail === "string") {
    email = userOrEmail.toLowerCase().trim();
  } else {
    email = (userOrEmail.email || "").toLowerCase().trim();
  }

  if (!email) return false;

  return ALLOWED_TEACHER_EMAILS.some(e => e.toLowerCase().trim() === email);
}

export function isTeacherEmail(email) {
  return isTeacherUser(email);
}
