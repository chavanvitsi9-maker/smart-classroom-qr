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

// [PROJECT CONFIGURATION]
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

// Teacher emails allowed to access Teacher Dashboard (admin.html)
export const ALLOWED_TEACHER_EMAILS = [
  "chavanvit.si9@gmail.com",
  "teacher@example.com"
];

// Dummy domain appended to Student ID for email/password authentication
export const STUDENT_EMAIL_DOMAIN = "@student.local";

// Initialize Primary Firebase Services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// Re-export Modular Auth Functions
export {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
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
 * Checks if a given email belongs to an authorized teacher.
 * Also returns true if the email ends with @teacher.local or matches configured list.
 */
export function isTeacherEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (lower === "chavanvit.si9@gmail.com" || lower === "teacher@example.com") {
    return true;
  }
  if (ALLOWED_TEACHER_EMAILS.some(e => e.toLowerCase().trim() === lower)) {
    return true;
  }
  // Allow wildcard teacher domains if configured
  if (lower.endsWith("@teacher.school") || lower.endsWith("@teacher.local")) {
    return true;
  }
  return false;
}

/**
 * Registers a student account in Firebase Auth using an ephemeral secondary Firebase App.
 * This prevents the current logged-in teacher from being logged out by createUserWithEmailAndPassword.
 */
export async function createStudentAuthAccount(studentId, password) {
  const email = `${studentId.trim()}${STUDENT_EMAIL_DOMAIN}`;
  const secondaryAppName = `student-registration-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    return userCredential.user;
  } catch (error) {
    await deleteApp(secondaryApp).catch(() => {});
    throw error;
  }
}
