// ============================================================================
// Student Application Logic (app.js)
// Smart Classroom QR Attendance System
// ============================================================================

import { 
  auth, 
  db, 
  googleProvider,
  signInWithEmailAndPassword, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  isTeacherEmail,
  ref,
  set,
  get,
  child,
  onValue
} from "./firebase-init.js";

// State
let currentUser = null;
let currentStudentId = null;
let currentStudentProfile = null;
let selectedSubject = null;
let html5QrCode = null;
let isScanning = false;
let isSubmitting = false;

// Default Subjects (can be loaded or extended via Firebase)
const DEFAULT_SUBJECTS = [
  { code: "CS101", name: "วิทยาการคอมพิวเตอร์เบื้องต้น", defaultStartTime: "09:00" },
  { code: "INT201", name: "การพัฒนาเว็บแอปพลิเคชัน", defaultStartTime: "10:30" },
  { code: "ENG102", name: "ภาษาอังกฤษเพื่อการสื่อสาร", defaultStartTime: "13:00" },
  { code: "MATH104", name: "สถิติและความน่าจะเป็น", defaultStartTime: "15:00" }
];

// DOM Elements
const authSection = document.getElementById("auth-section");
const studentAppSection = document.getElementById("student-app-section");
const tabStudent = document.getElementById("tab-student");
const tabTeacher = document.getElementById("tab-teacher");
const studentLoginForm = document.getElementById("student-login-form");
const teacherLoginBox = document.getElementById("teacher-login-box");
const studentIdInput = document.getElementById("student-id-input");
const studentPasswordInput = document.getElementById("student-password-input");
const btnStudentLogin = document.getElementById("btn-student-login");
const btnTeacherGoogleLogin = document.getElementById("btn-teacher-google-login");
const loginAlert = document.getElementById("login-alert");
const studentDisplayName = document.getElementById("student-display-name");
const btnLogout = document.getElementById("btn-logout");
const subjectGridContainer = document.getElementById("subject-grid-container");
const selectedSubjectBadge = document.getElementById("selected-subject-badge");
const btnStartScanner = document.getElementById("btn-start-scanner");
const btnStopScanner = document.getElementById("btn-stop-scanner");
const scanValidationResult = document.getElementById("scan-validation-result");
const studentHistoryTbody = document.getElementById("student-history-tbody");

// Modal Elements
const celebrationModal = document.getElementById("celebration-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalDetails = document.getElementById("modal-details");
const btnCloseModal = document.getElementById("btn-close-modal");

// ----------------------------------------------------------------------------
// 1. Audio Effect (Web Audio API Cute Chime)
// ----------------------------------------------------------------------------
function playCuteChime(type = "success") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Upbeat major triad chime
      osc.type = "sine";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      // Low warning tone
      osc.type = "triangle";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    console.debug("Audio play skipped:", e);
  }
}

// ----------------------------------------------------------------------------
// 2. Authentication UI & Tab Handlers
// ----------------------------------------------------------------------------
tabStudent.addEventListener("click", () => {
  tabStudent.classList.add("active");
  tabTeacher.classList.remove("active");
  studentLoginForm.classList.remove("hidden");
  teacherLoginBox.classList.add("hidden");
  clearLoginAlert();
});

tabTeacher.addEventListener("click", () => {
  tabTeacher.classList.add("active");
  tabStudent.classList.remove("active");
  teacherLoginBox.classList.remove("hidden");
  studentLoginForm.classList.add("hidden");
  clearLoginAlert();
});

function showLoginAlert(msg, type = "error") {
  loginAlert.className = "result-box " + (type === "error" ? "badge-absent" : "badge-ontime");
  loginAlert.style.display = "block";
  loginAlert.textContent = msg;
}

function clearLoginAlert() {
  loginAlert.className = "hidden";
  loginAlert.textContent = "";
}

// ----------------------------------------------------------------------------
// 3. Student Login Flow
// ----------------------------------------------------------------------------
studentLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearLoginAlert();
  const rawId = studentIdInput.value.trim();
  const password = studentPasswordInput.value;

  if (!rawId || !password) {
    showLoginAlert("โปรดระบุรหัสนักศึกษาและรหัสผ่าน");
    return;
  }

  btnStudentLogin.disabled = true;
  btnStudentLogin.innerHTML = `<span>⏳</span> กำลังเข้าสู่ระบบ...`;

  try {
    // Append dummy domain behind the scenes
    const studentEmail = `${rawId}@student.local`;
    await signInWithEmailAndPassword(auth, studentEmail, password);
    // onAuthStateChanged will handle UI transition
  } catch (error) {
    console.error("Student login error:", error);
    let errorMsg = "เข้าสู่ระบบไม่สำเร็จ รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง";
    if (error.code === "auth/user-not-found") {
      errorMsg = "ไม่พบบัญชีนักศึกษานี้ในระบบ โปรดให้อาจารย์ลงทะเบียนให้ก่อน";
    } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      errorMsg = "รหัสผ่านไม่ถูกต้อง โปรดลองอีกครั้ง";
    }
    showLoginAlert(errorMsg);
  } finally {
    btnStudentLogin.disabled = false;
    btnStudentLogin.innerHTML = `<span>⚡</span> เข้าสู่ระบบนักเรียน`;
  }
});

// ----------------------------------------------------------------------------
// 4. Teacher Login Flow (Google)
// ----------------------------------------------------------------------------
btnTeacherGoogleLogin.addEventListener("click", async () => {
  clearLoginAlert();
  btnTeacherGoogleLogin.disabled = true;
  btnTeacherGoogleLogin.innerHTML = `<span>⏳</span> กำลังเชื่อมต่อ Google...`;

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (isTeacherEmail(user.email)) {
      window.location.href = "admin.html";
    } else {
      // Logged in with Google, but not in authorized teacher list
      showLoginAlert(`บัญชี ${user.email} ไม่มีสิทธิ์เข้าใช้งานแดชบอร์ดอาจารย์`);
      await signOut(auth);
    }
  } catch (error) {
    console.error("Teacher Google login error:", error);
    if (error.code !== "auth/popup-closed-by-user") {
      showLoginAlert("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google: " + error.message);
    }
  } finally {
    btnTeacherGoogleLogin.disabled = false;
    btnTeacherGoogleLogin.innerHTML = `Teacher Login (Google)`;
  }
});

// Logout
btnLogout.addEventListener("click", async () => {
  await stopScanner();
  await signOut(auth);
  window.location.reload();
});

// ----------------------------------------------------------------------------
// 5. Auth State Observer
// ----------------------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // If teacher, redirect to admin.html
    if (isTeacherEmail(user.email)) {
      window.location.href = "admin.html";
      return;
    }

    // Extract student ID from dummy domain
    const email = user.email || "";
    if (email.includes("@student.local")) {
      currentStudentId = email.replace("@student.local", "").trim();
    } else {
      currentStudentId = email.split("@")[0];
    }

    // Fetch student profile details from RTDB
    await loadStudentProfile(currentStudentId);

    // Switch UI to Student App
    authSection.classList.add("hidden");
    studentAppSection.classList.remove("hidden");
    studentDisplayName.textContent = `${currentStudentProfile?.fullName || 'นักศึกษา'} (${currentStudentId})`;

    // Initialize Subjects and Today's History
    renderSubjectCards(DEFAULT_SUBJECTS);
    listenToStudentAttendanceHistory(currentStudentId);

  } else {
    currentUser = null;
    currentStudentId = null;
    authSection.classList.remove("hidden");
    studentAppSection.classList.add("hidden");
  }
});

async function loadStudentProfile(studentId) {
  try {
    const snapshot = await get(ref(db, `students/${studentId}`));
    if (snapshot.exists()) {
      currentStudentProfile = snapshot.val();
    } else {
      currentStudentProfile = { fullName: `รหัสนักศึกษา ${studentId}`, studentId };
    }
  } catch (e) {
    console.warn("Could not load student profile:", e);
    currentStudentProfile = { fullName: `รหัสนักศึกษา ${studentId}`, studentId };
  }
}

// ----------------------------------------------------------------------------
// 6. Subject Selection Grid
// ----------------------------------------------------------------------------
function renderSubjectCards(subjects) {
  subjectGridContainer.innerHTML = "";
  subjects.forEach(subject => {
    const card = document.createElement("div");
    card.className = "subject-card";
    card.dataset.code = subject.code;
    card.innerHTML = `
      <div class="subject-code">${subject.code}</div>
      <div class="subject-name">${subject.name}</div>
      <div class="subject-time">
        <span>⏰ เวลาเริ่มเรียน:</span>
        <strong style="color: var(--neon-cyan);">${subject.defaultStartTime} น.</strong>
      </div>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".subject-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedSubject = subject;
      selectedSubjectBadge.textContent = `${subject.code}: ${subject.name}`;
      selectedSubjectBadge.className = "badge-status badge-ontime";
      hideScanValidation();
    });

    subjectGridContainer.appendChild(card);
  });
}

// ----------------------------------------------------------------------------
// 7. QR Scanner Integration (html5-qrcode)
// ----------------------------------------------------------------------------
btnStartScanner.addEventListener("click", async () => {
  if (!selectedSubject) {
    alert("กรุณาเลือกวิชาที่ต้องการเช็คชื่อก่อนเริ่มสแกน");
    return;
  }
  await startScanner();
});

btnStopScanner.addEventListener("click", async () => {
  await stopScanner();
});

async function startScanner() {
  if (isScanning) return;
  hideScanValidation();

  try {
    html5QrCode = new Html5Qrcode("reader");
    const qrConfig = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    btnStartScanner.classList.add("hidden");
    btnStopScanner.classList.remove("hidden");
    isScanning = true;

    await html5QrCode.start(
      { facingMode: "environment" },
      qrConfig,
      onScanSuccess,
      onScanFailure
    );
  } catch (err) {
    console.error("Camera start error:", err);
    // Fallback to default user camera
    try {
      await html5QrCode.start(
        { facingMode: "user" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure
      );
    } catch (fallbackErr) {
      alert("ไม่สามารถเปิดกล้องได้ โปรดอนุญาตสิทธิ์การใช้กล้องในเบราว์เซอร์: " + fallbackErr.message);
      await stopScanner();
    }
  }
}

async function stopScanner() {
  if (html5QrCode && isScanning) {
    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch (e) {
      console.warn("Scanner stop error:", e);
    }
  }
  isScanning = false;
  btnStartScanner.classList.remove("hidden");
  btnStopScanner.classList.add("hidden");
}

function onScanFailure(error) {
  // Silent frame scan ignore
}

// ----------------------------------------------------------------------------
// 8. Attendance Validation & Database Submission
// ----------------------------------------------------------------------------
async function onScanSuccess(decodedText) {
  if (isSubmitting) return;

  console.log("QR Code Scanned:", decodedText);

  let qrData = null;
  try {
    qrData = JSON.parse(decodedText);
  } catch (e) {
    // If not JSON, check if it's formatted as 'SUBJECT_TIMESTAMP' or similar
    qrData = { raw: decodedText };
  }

  // Auto-stop scanner upon detect
  await stopScanner();

  // Validate QR Subject
  if (qrData.subjectCode && selectedSubject && qrData.subjectCode !== selectedSubject.code) {
    playCuteChime("error");
    showScanValidation(
      `วิชาไม่ตรงกัน! คุณเลือก ${selectedSubject.code} แต่คิวอาร์โค้ดนี้คือวิชา ${qrData.subjectCode}`,
      "Absent"
    );
    return;
  }

  // If student didn't select subject but QR specifies it, adopt it
  if (!selectedSubject && qrData.subjectCode) {
    selectedSubject = { code: qrData.subjectCode, name: qrData.subjectName || qrData.subjectCode };
  }

  // Anti-Cheat: Validate dynamic QR timestamp (valid for 45s)
  const now = new Date();
  if (qrData.timestamp) {
    const ageSeconds = Math.floor((now.getTime() - qrData.timestamp) / 1000);
    if (ageSeconds > 45) {
      playCuteChime("error");
      showScanValidation("คิวอาร์โค้ดนี้หมดอายุแล้ว (เกิน 30 วินาที) โปรดสแกนโค้ดใหม่บนจออาจารย์", "Absent");
      return;
    }
  }

  // Calculate Start Time & Attendance Status
  // Priority: QR startTime -> subject's defaultStartTime today -> now
  let classStartTime = new Date();
  if (qrData.startTime) {
    classStartTime = new Date(qrData.startTime);
  } else if (selectedSubject?.defaultStartTime) {
    const [hours, minutes] = selectedSubject.defaultStartTime.split(":");
    classStartTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  }

  // Difference in minutes between scan time and class start time
  const diffMinutes = Math.floor((now.getTime() - classStartTime.getTime()) / (60 * 1000));
  
  let status = "OnTime";
  let statusText = "ตรงเวลา (OnTime)";

  if (diffMinutes <= 10) {
    status = "OnTime";
    statusText = "ตรงเวลา (On-Time ⚡)";
  } else if (diffMinutes <= 20) {
    status = "Late";
    statusText = `สาย (${diffMinutes} นาที ⚠️)`;
  } else {
    // > 20 minutes: ABSENT - Block submission!
    status = "Absent";
    statusText = `ขาดเรียน (เกินเวลาเริ่มเรียน ${diffMinutes} นาที 🚫)`;
    playCuteChime("error");
    showScanValidation(
      `หมดเวลาเช็คชื่อแล้ว! สแกนช้ากว่าเวลาเริ่มเรียน ${diffMinutes} นาที (สถานะ: ขาดเรียน) ระบบบล็อกการบันทึกข้อมูล`,
      "Absent"
    );
    return;
  }

  // Date Key (YYYY-MM-DD)
  const dateStr = now.toISOString().split("T")[0];
  const subjectCode = selectedSubject ? selectedSubject.code : (qrData.subjectCode || "GENERAL");
  const attendanceRecordKey = `${currentStudentId}_${subjectCode}_${dateStr}`;

  // Double Submission Prevention Guard
  isSubmitting = true;
  btnStartScanner.disabled = true;

  try {
    const existingSnap = await get(ref(db, `attendance/${attendanceRecordKey}`));
    if (existingSnap.exists()) {
      playCuteChime("error");
      showScanValidation(`คุณได้เช็คชื่อวิชา ${subjectCode} สำหรับวันนี้ไปเรียบร้อยแล้ว`, "Late");
      isSubmitting = false;
      btnStartScanner.disabled = false;
      return;
    }

    // Save to Firebase RTDB path: attendance/{studentId}_{subjectCode}_{date}
    const attendancePayload = {
      id: attendanceRecordKey,
      studentId: currentStudentId,
      studentName: currentStudentProfile?.fullName || currentStudentId,
      subjectCode: subjectCode,
      subjectName: selectedSubject?.name || subjectCode,
      scanTime: now.toISOString(),
      classStartTime: classStartTime.toISOString(),
      status: status,
      minutesLate: Math.max(0, diffMinutes),
      date: dateStr,
      timestamp: Date.now()
    };

    await set(ref(db, `attendance/${attendanceRecordKey}`), attendancePayload);

    // Success! Play chime and show modal
    playCuteChime("success");
    showSuccessCelebration(attendancePayload, statusText);

  } catch (error) {
    console.error("Save attendance error:", error);
    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message);
  } finally {
    isSubmitting = false;
    btnStartScanner.disabled = false;
  }
}

function showScanValidation(message, status) {
  scanValidationResult.classList.remove("hidden");
  let badgeClass = "badge-ontime";
  if (status === "Late") badgeClass = "badge-late";
  if (status === "Absent") badgeClass = "badge-absent";

  scanValidationResult.className = `result-box ${badgeClass}`;
  scanValidationResult.innerHTML = `<strong>${message}</strong>`;
}

function hideScanValidation() {
  scanValidationResult.classList.add("hidden");
  scanValidationResult.innerHTML = "";
}

// ----------------------------------------------------------------------------
// 9. Success Modal & History
// ----------------------------------------------------------------------------
function showSuccessCelebration(record, statusText) {
  modalTitle.textContent = "CHECK-IN COMPLETE! 🎉";
  modalMessage.textContent = `เช็คชื่อเข้าเรียนวิชา ${record.subjectCode} สำเร็จแล้ว`;
  
  modalDetails.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
      <span class="text-muted">รหัสนักศึกษา:</span>
      <strong>${record.studentId}</strong>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
      <span class="text-muted">ชื่อ-สกุล:</span>
      <strong>${record.studentName}</strong>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
      <span class="text-muted">วิชา:</span>
      <strong style="color: var(--neon-cyan);">${record.subjectCode} - ${record.subjectName}</strong>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
      <span class="text-muted">เวลาสแกน:</span>
      <strong>${new Date(record.scanTime).toLocaleTimeString('th-TH')}</strong>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span class="text-muted">ผลการเช็คชื่อ:</span>
      <span class="badge-status ${record.status === 'OnTime' ? 'badge-ontime' : 'badge-late'}">
        ${statusText}
      </span>
    </div>
  `;

  celebrationModal.classList.add("active");
}

btnCloseModal.addEventListener("click", () => {
  celebrationModal.classList.remove("active");
});

// Real-time History Listener for Current Student
function listenToStudentAttendanceHistory(studentId) {
  const attendanceRef = ref(db, "attendance");
  const todayStr = new Date().toISOString().split("T")[0];

  onValue(attendanceRef, (snapshot) => {
    if (!snapshot.exists()) {
      studentHistoryTbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">ยังไม่มีประวัติการเช็คชื่อในวันนี้</td></tr>`;
      return;
    }

    const data = snapshot.val();
    const records = Object.values(data).filter(r => r.studentId === studentId && r.date === todayStr);

    if (records.length === 0) {
      studentHistoryTbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">ยังไม่มีประวัติการเช็คชื่อในวันนี้</td></tr>`;
      return;
    }

    studentHistoryTbody.innerHTML = records.map(r => {
      const timeStr = new Date(r.scanTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      let badgeClass = "badge-ontime";
      let statusLabel = "ตรงเวลา";
      if (r.status === "Late") {
        badgeClass = "badge-late";
        statusLabel = `สาย (+${r.minutesLate}น.)`;
      } else if (r.status === "Absent") {
        badgeClass = "badge-absent";
        statusLabel = "ขาดเรียน";
      }

      return `
        <tr>
          <td><strong style="color: var(--neon-cyan);">${r.subjectCode}</strong> ${r.subjectName || ''}</td>
          <td>${timeStr} น.</td>
          <td><span class="badge-status ${badgeClass}">${statusLabel}</span></td>
        </tr>
      `;
    }).join("");
  });
}
