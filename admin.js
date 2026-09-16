// ============================================================================
// Teacher Dashboard Logic (admin.js)
// Smart Classroom QR Attendance System
// ============================================================================

import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  isTeacherEmail,
  isTeacherUser,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  createStudentAuthAccount
} from "./firebase-init.js";

// State
let currentTeacher = null;
let allTodayRecords = [];
let allStudents = [];
let allSubjects = [];
let qrCodeInstance = null;
let qrTimerInterval = null;
let qrCountdown = 30;
let isProjectorMode = false;

// DOM Elements - Navigation & Auth
const teacherProfileEmail = document.getElementById("teacher-profile-email");
const btnAdminLogout = document.getElementById("btn-admin-logout");
const navBtnAttendance = document.getElementById("nav-btn-attendance");
const navBtnQr = document.getElementById("nav-btn-qr");
const navBtnSubjects = document.getElementById("nav-btn-subjects");
const navBtnStudents = document.getElementById("nav-btn-students");
const tabContentAttendance = document.getElementById("tab-content-attendance");
const tabContentQr = document.getElementById("tab-content-qr");
const tabContentSubjects = document.getElementById("tab-content-subjects");
const tabContentStudents = document.getElementById("tab-content-students");

// Attendance DOM
const statTotalCount = document.getElementById("stat-total-count");
const statOntimeCount = document.getElementById("stat-ontime-count");
const statLateCount = document.getElementById("stat-late-count");
const statAbsentCount = document.getElementById("stat-absent-count");
const filterSearch = document.getElementById("filter-search");
const filterSubject = document.getElementById("filter-subject");
const filterStatus = document.getElementById("filter-status");
const attendanceTbody = document.getElementById("attendance-tbody");

// Dynamic QR DOM
const qrSubjectSelect = document.getElementById("qr-subject-select");
const qrStartTime = document.getElementById("qr-start-time");
const qrcodeElement = document.getElementById("qrcode");
const qrTimerFill = document.getElementById("qr-timer-fill");
const qrTimerSeconds = document.getElementById("qr-timer-seconds");
const btnForceRefreshQr = document.getElementById("btn-force-refresh-qr");
const btnToggleProjector = document.getElementById("btn-toggle-projector");

// Student Management DOM
const createStudentForm = document.getElementById("create-student-form");
const newStudentId = document.getElementById("new-student-id");
const newStudentName = document.getElementById("new-student-name");
const newStudentRoom = document.getElementById("new-student-room");
const newStudentPassword = document.getElementById("new-student-password");
const btnSaveStudent = document.getElementById("btn-save-student");
const studentCreationAlert = document.getElementById("student-creation-alert");
const studentRosterTbody = document.getElementById("student-roster-tbody");
const searchRoster = document.getElementById("search-roster");

// Edit Student Modal DOM
const editStudentModal = document.getElementById("edit-student-modal");
const btnCloseEditStudentModal = document.getElementById("btn-close-edit-student-modal");
const btnCancelEditStudent = document.getElementById("btn-cancel-edit-student");
const editStudentForm = document.getElementById("edit-student-form");
const editStudentIdHidden = document.getElementById("edit-student-id-hidden");
const editStudentIdDisplay = document.getElementById("edit-student-id-display");
const editStudentNameInput = document.getElementById("edit-student-name-input");
const editStudentRoomInput = document.getElementById("edit-student-room-input");

// Subject Management DOM
const createSubjectForm = document.getElementById("create-subject-form");
const newSubjectCode = document.getElementById("new-subject-code");
const newSubjectName = document.getElementById("new-subject-name");
const newSubjectTarget = document.getElementById("new-subject-target");
const newSubjectTime = document.getElementById("new-subject-time");
const newSubjectRoom = document.getElementById("new-subject-room");
const btnSaveSubject = document.getElementById("btn-save-subject");
const subjectCreationAlert = document.getElementById("subject-creation-alert");
const subjectRosterTbody = document.getElementById("subject-roster-tbody");
const searchSubjects = document.getElementById("search-subjects");

// Edit Subject Modal DOM
const editSubjectModal = document.getElementById("edit-subject-modal");
const btnCloseEditSubjectModal = document.getElementById("btn-close-edit-subject-modal");
const btnCancelEditSubject = document.getElementById("btn-cancel-edit-subject");
const editSubjectForm = document.getElementById("edit-subject-form");
const editSubjectCodeHidden = document.getElementById("edit-subject-code-hidden");
const editSubjectCodeDisplay = document.getElementById("edit-subject-code-display");
const editSubjectNameInput = document.getElementById("edit-subject-name-input");
const editSubjectTargetInput = document.getElementById("edit-subject-target-input");
const editSubjectTimeInput = document.getElementById("edit-subject-time-input");
const editSubjectRoomInput = document.getElementById("edit-subject-room-input");

// Edit Modal DOM
const editAttendanceModal = document.getElementById("edit-attendance-modal");
const btnCloseEditModal = document.getElementById("btn-close-edit-modal");
const btnCancelEdit = document.getElementById("btn-cancel-edit");
const editAttendanceForm = document.getElementById("edit-attendance-form");
const editRecordId = document.getElementById("edit-record-id");
const editStudentDisplay = document.getElementById("edit-student-display");
const editSubjectDisplay = document.getElementById("edit-subject-display");
const editStatusSelect = document.getElementById("edit-status-select");
const editNoteInput = document.getElementById("edit-note-input");

// ----------------------------------------------------------------------------
// 1. ROUTE GUARDING & AUTHENTICATION
// ----------------------------------------------------------------------------
onAuthStateChanged(auth, (user) => {
  if (!user || !isTeacherUser(user)) {
    console.warn("Unauthorized access attempt. Redirecting to index.html...");
    window.location.replace("index.html");
    return;
  }

  currentTeacher = user;
  teacherProfileEmail.textContent = user.email;

  // Initialize Dashboard Modules
  initAttendanceListener();
  initSubjectListener();
  initStudentRosterListener();
  initDynamicQrGenerator();
});

btnAdminLogout.addEventListener("click", async () => {
  if (confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
    clearInterval(qrTimerInterval);
    await signOut(auth);
    window.location.replace("index.html");
  }
});

// ----------------------------------------------------------------------------
// 2. NAVIGATION TABS
// ----------------------------------------------------------------------------
function switchTab(activeBtn, activeContent) {
  [navBtnAttendance, navBtnQr, navBtnSubjects, navBtnStudents].forEach(b => b && b.classList.remove("active"));
  [tabContentAttendance, tabContentQr, tabContentSubjects, tabContentStudents].forEach(c => c && c.classList.add("hidden"));

  if (activeBtn) activeBtn.classList.add("active");
  if (activeContent) activeContent.classList.remove("hidden");
}

navBtnAttendance.addEventListener("click", () => switchTab(navBtnAttendance, tabContentAttendance));
navBtnQr.addEventListener("click", () => {
  switchTab(navBtnQr, tabContentQr);
  generateDynamicQr();
});
navBtnSubjects.addEventListener("click", () => switchTab(navBtnSubjects, tabContentSubjects));
navBtnStudents.addEventListener("click", () => switchTab(navBtnStudents, tabContentStudents));

// ----------------------------------------------------------------------------
// 3. TODAY'S ATTENDANCE REALTIME LISTENER
// ----------------------------------------------------------------------------
function initAttendanceListener() {
  const attendanceRef = ref(db, "attendance");
  const todayStr = new Date().toISOString().split("T")[0];

  onValue(attendanceRef, (snapshot) => {
    if (!snapshot.exists()) {
      allTodayRecords = [];
      renderAttendanceTable();
      updateStatsCounters();
      return;
    }

    const rawData = snapshot.val();
    allTodayRecords = Object.values(rawData).filter(record => record.date === todayStr);

    // Sort newest scan first
    allTodayRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    updateStatsCounters();
    renderAttendanceTable();
  }, (error) => {
    console.error("Attendance listener error:", error);
    attendanceTbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="color: var(--neon-red);">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}</td></tr>`;
  });
}

function updateStatsCounters() {
  const total = allTodayRecords.length;
  const onTime = allTodayRecords.filter(r => r.status === "OnTime").length;
  const late = allTodayRecords.filter(r => r.status === "Late").length;
  const absent = allTodayRecords.filter(r => r.status === "Absent").length;

  statTotalCount.textContent = total;
  statOntimeCount.textContent = onTime;
  statLateCount.textContent = late;
  statAbsentCount.textContent = absent;
}

function renderAttendanceTable() {
  const search = filterSearch.value.trim().toLowerCase();
  const selectedSub = filterSubject.value;
  const selectedStatus = filterStatus.value;

  const filtered = allTodayRecords.filter(record => {
    const matchSearch = !search || 
      (record.studentId && record.studentId.toLowerCase().includes(search)) ||
      (record.studentName && record.studentName.toLowerCase().includes(search));
    
    const matchSub = selectedSub === "ALL" || record.subjectCode === selectedSub;
    const matchStatus = selectedStatus === "ALL" || record.status === selectedStatus;

    return matchSearch && matchSub && matchStatus;
  });

  if (filtered.length === 0) {
    attendanceTbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted" style="padding: 2rem;">
          ไม่มีข้อมูลการเช็คชื่อที่ตรงกับเงื่อนไข
        </td>
      </tr>
    `;
    return;
  }

  attendanceTbody.innerHTML = filtered.map(record => {
    const scanTimeFormatted = record.scanTime 
      ? new Date(record.scanTime).toLocaleTimeString('th-TH') 
      : "-";

    let badgeClass = "badge-ontime";
    let statusDisplay = "ตรงเวลา";

    if (record.status === "Late") {
      badgeClass = "badge-late";
      statusDisplay = `มาสาย (${record.minutesLate || 0} นาที)`;
    } else if (record.status === "Absent") {
      badgeClass = "badge-absent";
      statusDisplay = "ขาดเรียน";
    }

    return `
      <tr data-id="${record.id}">
        <td><strong>${record.studentId}</strong></td>
        <td>${record.studentName || '-'}</td>
        <td><span style="color: var(--neon-cyan); font-weight: 600;">${record.subjectCode}</span></td>
        <td>${scanTimeFormatted} น.</td>
        <td>${record.minutesLate ? `+${record.minutesLate} นาที` : '-'}</td>
        <td><span class="badge-status ${badgeClass}">${statusDisplay}</span></td>
        <td style="text-align: center;">
          <button type="button" class="btn-cyber btn-secondary btn-edit-row" data-id="${record.id}" style="width: auto; padding: 0.25rem 0.6rem; font-size: 0.8rem;">
            ✏️ แก้ไข
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // Attach click listener for retroactive edit
  document.querySelectorAll(".btn-edit-row").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const recId = btn.dataset.id;
      const rec = allTodayRecords.find(r => r.id === recId);
      if (rec) openEditModal(rec);
    });
  });

  // Allow clicking whole row to edit
  document.querySelectorAll("#attendance-tbody tr").forEach(row => {
    row.addEventListener("click", () => {
      const recId = row.dataset.id;
      if (!recId) return;
      const rec = allTodayRecords.find(r => r.id === recId);
      if (rec) openEditModal(rec);
    });
  });
}

// Filter listeners
filterSearch.addEventListener("input", renderAttendanceTable);
filterSubject.addEventListener("change", renderAttendanceTable);
filterStatus.addEventListener("change", renderAttendanceTable);

// ----------------------------------------------------------------------------
// 4. RETROACTIVE EDIT ATTENDANCE MODAL
// ----------------------------------------------------------------------------
function openEditModal(record) {
  editRecordId.value = record.id;
  editStudentDisplay.textContent = `${record.studentName} (${record.studentId})`;
  editSubjectDisplay.textContent = `${record.subjectCode} - ${record.subjectName || ''}`;
  editStatusSelect.value = record.status || "OnTime";
  editNoteInput.value = record.teacherNote || "";

  editAttendanceModal.classList.add("active");
}

function closeEditModal() {
  editAttendanceModal.classList.remove("active");
  editAttendanceForm.reset();
}

btnCloseEditModal.addEventListener("click", closeEditModal);
btnCancelEdit.addEventListener("click", closeEditModal);

editAttendanceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const recordId = editRecordId.value;
  const newStatus = editStatusSelect.value;
  const note = editNoteInput.value.trim();

  if (!recordId) return;

  const btnConfirm = document.getElementById("btn-confirm-edit");
  btnConfirm.disabled = true;
  btnConfirm.textContent = "กำลังบันทึก...";

  try {
    const recordRef = ref(db, `attendance/${recordId}`);
    await update(recordRef, {
      status: newStatus,
      teacherNote: note,
      retroactiveEditedBy: currentTeacher?.email || "teacher",
      retroactiveEditedAt: Date.now()
    });

    closeEditModal();
  } catch (err) {
    console.error("Update status error:", err);
    alert("เกิดข้อผิดพลาดในการแก้ไข: " + err.message);
  } finally {
    btnConfirm.disabled = false;
    btnConfirm.textContent = "💾 บันทึกการเปลี่ยนแปลง";
  }
});

// ----------------------------------------------------------------------------
// 5. DYNAMIC ANTI-CHEAT QR CODE GENERATOR (30s REFRESH)
// ----------------------------------------------------------------------------
function initDynamicQrGenerator() {
  // Sync subject change with default start time
  qrSubjectSelect.addEventListener("change", () => {
    const selectedOpt = qrSubjectSelect.selectedOptions[0];
    const defaultTime = selectedOpt.dataset.time || "09:00";
    qrStartTime.value = defaultTime;
    generateDynamicQr();
  });

  qrStartTime.addEventListener("change", generateDynamicQr);
  btnForceRefreshQr.addEventListener("click", generateDynamicQr);

  // Toggle Projector Fullscreen Mode
  btnToggleProjector.addEventListener("click", () => {
    isProjectorMode = !isProjectorMode;
    if (isProjectorMode) {
      tabContentQr.classList.add("projector-mode");
      btnToggleProjector.textContent = "❌ ปิดโหมดฉายจอโปรเจกเตอร์";
    } else {
      tabContentQr.classList.remove("projector-mode");
      btnToggleProjector.textContent = "📽️ เปิดโหมดฉายจอโปรเจกเตอร์";
    }
  });

  // ESC to exit projector mode
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isProjectorMode) {
      isProjectorMode = false;
      tabContentQr.classList.remove("projector-mode");
      btnToggleProjector.textContent = "📽️ เปิดโหมดฉายจอโปรเจกเตอร์";
    }
  });

  // Start 30s Countdown Loop
  startQrAutoRefreshLoop();
}

function startQrAutoRefreshLoop() {
  clearInterval(qrTimerInterval);
  qrCountdown = 30;

  qrTimerInterval = setInterval(() => {
    qrCountdown--;
    if (qrCountdown <= 0) {
      generateDynamicQr();
      qrCountdown = 30;
    }

    // Update timer UI
    qrTimerSeconds.textContent = qrCountdown;
    const progressPercent = (qrCountdown / 30) * 100;
    qrTimerFill.style.width = `${progressPercent}%`;
  }, 1000);
}

function generateDynamicQr() {
  qrCountdown = 30;
  qrTimerSeconds.textContent = "30";
  qrTimerFill.style.width = "100%";

  const selectedOpt = qrSubjectSelect.selectedOptions[0];
  if (!selectedOpt) return;
  const subjectCode = selectedOpt.value;
  const timeVal = qrStartTime.value || "09:00";

  // Build Start Time ISO for Today
  const now = new Date();
  const [hh, mm] = timeVal.split(":");
  const startTimeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hh, 10), parseInt(mm, 10), 0, 0);

  // Anti-Cheat Payload: 100% clean ASCII (prevents Unicode overflow in QRCode.js)
  const payload = {
    subjectCode: subjectCode,
    startTime: startTimeDate.toISOString(),
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 10)
  };

  const payloadString = JSON.stringify(payload);

  // Clear previous QR code canvas/image
  qrcodeElement.innerHTML = "";

  try {
    if (typeof QRCode !== "undefined") {
      qrCodeInstance = new QRCode(qrcodeElement, {
        text: payloadString,
        width: 256,
        height: 256,
        colorDark: "#121218",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      throw new Error("QRCode library not loaded yet");
    }
  } catch (err) {
    console.warn("QRCode local generation failed, using reliable fallback:", err);
    // Reliable Fallback using high-speed QR API so a QR is 100% guaranteed to show
    const encoded = encodeURIComponent(payloadString);
    qrcodeElement.innerHTML = `
      <img 
        src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encoded}" 
        alt="Dynamic QR Code" 
        style="width: 256px; height: 256px; display: block; margin: 0 auto; border-radius: 4px;"
      >
    `;
  }
}

// ----------------------------------------------------------------------------
// 6. STUDENT MANAGEMENT & ROSTER
// ----------------------------------------------------------------------------
createStudentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  studentCreationAlert.className = "hidden";

  const studentId = newStudentId.value.trim();
  const fullName = newStudentName.value.trim();
  const gradeRoom = newStudentRoom.value.trim();
  const password = newStudentPassword.value;

  if (!studentId || !fullName || !password) {
    alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
    return;
  }

  btnSaveStudent.disabled = true;
  btnSaveStudent.innerHTML = `<span>⏳</span> กำลังสร้างบัญชี...`;

  try {
    // 1. Create Auth Account using Ephemeral Secondary Firebase App (Never logs out teacher!)
    await createStudentAuthAccount(studentId, password);

    // 2. Save Student Profile in Realtime Database under /students/{studentId}
    const studentProfile = {
      studentId: studentId,
      fullName: fullName,
      gradeGroup: gradeRoom,
      email: `${studentId}@student.local`,
      createdAt: Date.now(),
      createdBy: currentTeacher?.email || "teacher"
    };

    await set(ref(db, `students/${studentId}`), studentProfile);

    // Success alert
    studentCreationAlert.className = "result-box badge-ontime";
    studentCreationAlert.innerHTML = `✅ เพิ่มนักเรียน <strong>${fullName} (${studentId})</strong> สำเร็จ! สามารถใช้นักเรียนล็อกอินได้ทันที`;
    studentCreationAlert.style.display = "block";

    createStudentForm.reset();
  } catch (err) {
    console.error("Create student error:", err);
    let errMsg = err.message;
    if (err.code === "auth/email-already-in-use") {
      errMsg = `รหัสนักเรียน ${studentId} ถูกลงทะเบียนไว้แล้วในระบบ`;
    }
    studentCreationAlert.className = "result-box badge-absent";
    studentCreationAlert.innerHTML = `❌ ไม่สามารถสร้างบัญชีได้: ${errMsg}`;
    studentCreationAlert.style.display = "block";
  } finally {
    btnSaveStudent.disabled = false;
    btnSaveStudent.innerHTML = `<span>💾</span> บันทึกและสร้างบัญชี`;
  }
});

function initStudentRosterListener() {
  const studentsRef = ref(db, "students");

  onValue(studentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      allStudents = [];
      renderStudentRoster();
      return;
    }

    const data = snapshot.val();
    allStudents = Object.values(data);
    allStudents.sort((a, b) => a.studentId.localeCompare(b.studentId));
    renderStudentRoster();
  });
}

function renderStudentRoster() {
  const search = searchRoster.value.trim().toLowerCase();
  const filtered = allStudents.filter(s => {
    return !search ||
      (s.studentId && s.studentId.toLowerCase().includes(search)) ||
      (s.fullName && s.fullName.toLowerCase().includes(search)) ||
      (s.gradeGroup && s.gradeGroup.toLowerCase().includes(search));
  });

  if (filtered.length === 0) {
    studentRosterTbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted" style="padding: 1.5rem;">
          ยังไม่มีข้อมูลนักเรียนที่ค้นหา
        </td>
      </tr>
    `;
    return;
  }

  studentRosterTbody.innerHTML = filtered.map(student => {
    return `
      <tr>
        <td><strong>${student.studentId}</strong></td>
        <td>${student.fullName}</td>
        <td><span class="badge-status badge-ontime" style="font-size: 0.75rem;">${student.gradeGroup || '-'}</span></td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${student.email}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button type="button" class="btn-cyber btn-secondary btn-edit-student" data-id="${student.studentId}" style="width: auto; padding: 0.25rem 0.6rem; font-size: 0.75rem; color: var(--neon-cyan); margin-right: 0.35rem;">
            ✏️ แก้ไข
          </button>
          <button type="button" class="btn-cyber btn-secondary btn-delete-student" data-id="${student.studentId}" style="width: auto; padding: 0.25rem 0.6rem; font-size: 0.75rem; color: var(--neon-red);">
            🗑️ ลบ
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // Attach edit student listeners
  document.querySelectorAll(".btn-edit-student").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const student = allStudents.find(s => s.studentId === id);
      if (student) openEditStudentModal(student);
    });
  });

  // Attach delete student listeners
  document.querySelectorAll(".btn-delete-student").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนักเรียนรหัส ${id}?`)) {
        try {
          await remove(ref(db, `students/${id}`));
        } catch (err) {
          alert("ไม่สามารถลบได้: " + err.message);
        }
      }
    });
  });
}

searchRoster.addEventListener("input", renderStudentRoster);

// ----------------------------------------------------------------------------
// 7. EDIT STUDENT MODAL LOGIC
// ----------------------------------------------------------------------------
function openEditStudentModal(student) {
  editStudentIdHidden.value = student.studentId;
  editStudentIdDisplay.textContent = student.studentId;
  editStudentNameInput.value = student.fullName || "";
  editStudentRoomInput.value = student.gradeGroup || "";

  editStudentModal.classList.add("active");
}

function closeEditStudentModal() {
  editStudentModal.classList.remove("active");
  editStudentForm.reset();
}

if (btnCloseEditStudentModal) btnCloseEditStudentModal.addEventListener("click", closeEditStudentModal);
if (btnCancelEditStudent) btnCancelEditStudent.addEventListener("click", closeEditStudentModal);

if (editStudentForm) {
  editStudentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = editStudentIdHidden.value;
    const fullName = editStudentNameInput.value.trim();
    const gradeGroup = editStudentRoomInput.value.trim();

    if (!id || !fullName) return;

    const btnConfirm = document.getElementById("btn-confirm-edit-student");
    btnConfirm.disabled = true;
    btnConfirm.textContent = "กำลังบันทึก...";

    try {
      await update(ref(db, `students/${id}`), {
        fullName: fullName,
        gradeGroup: gradeGroup,
        updatedAt: Date.now(),
        updatedBy: currentTeacher?.email || "teacher"
      });
      closeEditStudentModal();
    } catch (err) {
      console.error("Update student error:", err);
      alert("เกิดข้อผิดพลาดในการแก้ไขข้อมูลนักเรียน: " + err.message);
    } finally {
      btnConfirm.disabled = false;
      btnConfirm.textContent = "💾 บันทึกการแก้ไข";
    }
  });
}

// ----------------------------------------------------------------------------
// 8. SUBJECT MANAGEMENT (ADD, EDIT, DELETE, REALTIME SYNC)
// ----------------------------------------------------------------------------
function initSubjectListener() {
  const subjectsRef = ref(db, "subjects");

  onValue(subjectsRef, async (snapshot) => {
    if (!snapshot.exists()) {
      // Seed initial subjects into Firebase Realtime Database
      const initialSubjects = {
        CS101: { code: "CS101", name: "วิทยาการคอมพิวเตอร์เบื้องต้น", targetGrade: "ม.4/1", defaultStartTime: "09:00", room: "Lab 401", createdAt: Date.now() },
        INT201: { code: "INT201", name: "การพัฒนาเว็บแอปพลิเคชัน", targetGrade: "ม.4/2", defaultStartTime: "10:30", room: "Lab 1", createdAt: Date.now() },
        ENG102: { code: "ENG102", name: "ภาษาอังกฤษเพื่อการสื่อสาร", targetGrade: "ม.4/1, ม.4/2", defaultStartTime: "13:00", room: "ห้อง 205", createdAt: Date.now() },
        MATH104: { code: "MATH104", name: "สถิติและความน่าจะเป็น", targetGrade: "ม.4/1, ม.4/2", defaultStartTime: "15:00", room: "ห้อง 302", createdAt: Date.now() }
      };
      await set(subjectsRef, initialSubjects);
      return;
    }

    const data = snapshot.val();
    allSubjects = Object.values(data);
    allSubjects.sort((a, b) => a.code.localeCompare(b.code));

    renderSubjectRoster();
    updateSubjectDropdowns();
  });
}

function renderSubjectRoster() {
  if (!subjectRosterTbody) return;
  const search = searchSubjects ? searchSubjects.value.trim().toLowerCase() : "";
  const filtered = allSubjects.filter(s => {
    return !search ||
      (s.code && s.code.toLowerCase().includes(search)) ||
      (s.name && s.name.toLowerCase().includes(search)) ||
      (s.targetGrade && s.targetGrade.toLowerCase().includes(search)) ||
      (s.room && s.room.toLowerCase().includes(search));
  });

  if (filtered.length === 0) {
    subjectRosterTbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 1.5rem;">
          ยังไม่มีข้อมูลรายวิชาที่ค้นหา
        </td>
      </tr>
    `;
    return;
  }

  subjectRosterTbody.innerHTML = filtered.map(subject => {
    const targetDisplay = subject.targetGrade ? subject.targetGrade : "ทุกชั้นเรียน";
    return `
      <tr>
        <td><strong style="color: var(--neon-cyan);">${subject.code}</strong></td>
        <td>${subject.name}</td>
        <td><span class="badge-status badge-ontime" style="font-size: 0.75rem;">${targetDisplay}</span></td>
        <td><span class="badge-status badge-ontime" style="font-size: 0.75rem;">⏰ ${subject.defaultStartTime || '09:00'} น.</span></td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${subject.room || '-'}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button type="button" class="btn-cyber btn-secondary btn-edit-subject" data-code="${subject.code}" style="width: auto; padding: 0.25rem 0.6rem; font-size: 0.75rem; color: var(--neon-cyan); margin-right: 0.35rem;">
            ✏️ แก้ไข
          </button>
          <button type="button" class="btn-cyber btn-secondary btn-delete-subject" data-code="${subject.code}" style="width: auto; padding: 0.25rem 0.6rem; font-size: 0.75rem; color: var(--neon-red);">
            🗑️ ลบ
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // Attach Edit Subject Listeners
  document.querySelectorAll(".btn-edit-subject").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = btn.dataset.code;
      const subj = allSubjects.find(s => s.code === code);
      if (subj) openEditSubjectModal(subj);
    });
  });

  // Attach Delete Subject Listeners
  document.querySelectorAll(".btn-delete-subject").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const code = btn.dataset.code;
      const subj = allSubjects.find(s => s.code === code);
      const name = subj ? subj.name : code;
      if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบวิชา "${code} - ${name}" ออกจากระบบ?`)) {
        try {
          await remove(ref(db, `subjects/${code}`));
        } catch (err) {
          alert("ไม่สามารถลบรายวิชาได้: " + err.message);
        }
      }
    });
  });
}

if (searchSubjects) searchSubjects.addEventListener("input", renderSubjectRoster);

function updateSubjectDropdowns() {
  if (!qrSubjectSelect) return;

  const currentQrVal = qrSubjectSelect.value;
  const currentFilterVal = filterSubject ? filterSubject.value : "ALL";

  // 1. Update QR Subject Selector
  qrSubjectSelect.innerHTML = allSubjects.map(s => {
    const targetLabel = s.targetGrade ? `(ชั้น ${s.targetGrade})` : "(ทุกชั้นเรียน)";
    return `<option value="${s.code}" data-name="${s.name}" data-time="${s.defaultStartTime || '09:00'}">${s.code} - ${s.name} ${targetLabel}</option>`;
  }).join("");

  if (currentQrVal && allSubjects.some(s => s.code === currentQrVal)) {
    qrSubjectSelect.value = currentQrVal;
  } else if (allSubjects.length > 0) {
    qrSubjectSelect.value = allSubjects[0].code;
    qrStartTime.value = allSubjects[0].defaultStartTime || "09:00";
  }

  // 2. Update Attendance Filter Dropdown
  if (filterSubject) {
    let filterOpts = `<option value="ALL">ทุกวิชา</option>`;
    filterOpts += allSubjects.map(s => `<option value="${s.code}">${s.code} - ${s.name}</option>`).join("");
    filterSubject.innerHTML = filterOpts;

    if (currentFilterVal && (currentFilterVal === "ALL" || allSubjects.some(s => s.code === currentFilterVal))) {
      filterSubject.value = currentFilterVal;
    }
  }
}

// Create New Subject
if (createSubjectForm) {
  createSubjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (subjectCreationAlert) subjectCreationAlert.className = "hidden";

    const code = newSubjectCode.value.trim().toUpperCase();
    const name = newSubjectName.value.trim();
    const targetGrade = newSubjectTarget ? newSubjectTarget.value.trim() : "";
    const startTime = newSubjectTime.value || "09:00";
    const room = newSubjectRoom.value.trim();

    if (!code || !name) {
      alert("กรุณาระบุรหัสวิชาและชื่อวิชา");
      return;
    }

    btnSaveSubject.disabled = true;
    btnSaveSubject.innerHTML = `<span>⏳</span> กำลังบันทึก...`;

    try {
      await set(ref(db, `subjects/${code}`), {
        code: code,
        name: name,
        targetGrade: targetGrade,
        defaultStartTime: startTime,
        room: room,
        createdAt: Date.now(),
        createdBy: currentTeacher?.email || "teacher"
      });

      if (subjectCreationAlert) {
        subjectCreationAlert.className = "result-box badge-ontime";
        subjectCreationAlert.innerHTML = `✅ เพิ่มวิชา <strong>${code} - ${name}</strong> ${targetGrade ? `(สำหรับชั้น ${targetGrade})` : ''} สำเร็จแล้ว!`;
        subjectCreationAlert.style.display = "block";
      }

      createSubjectForm.reset();
      newSubjectTime.value = "09:00";
    } catch (err) {
      console.error("Create subject error:", err);
      if (subjectCreationAlert) {
        subjectCreationAlert.className = "result-box badge-absent";
        subjectCreationAlert.innerHTML = `❌ ไม่สามารถเพิ่มวิชาได้: ${err.message}`;
        subjectCreationAlert.style.display = "block";
      }
    } finally {
      btnSaveSubject.disabled = false;
      btnSaveSubject.innerHTML = `<span>💾</span> บันทึกรายวิชา`;
    }
  });
}

// Edit Subject Modal Handlers
function openEditSubjectModal(subject) {
  editSubjectCodeHidden.value = subject.code;
  editSubjectCodeDisplay.textContent = subject.code;
  editSubjectNameInput.value = subject.name || "";
  if (editSubjectTargetInput) editSubjectTargetInput.value = subject.targetGrade || "";
  editSubjectTimeInput.value = subject.defaultStartTime || "09:00";
  editSubjectRoomInput.value = subject.room || "";

  editSubjectModal.classList.add("active");
}

function closeEditSubjectModal() {
  editSubjectModal.classList.remove("active");
  editSubjectForm.reset();
}

if (btnCloseEditSubjectModal) btnCloseEditSubjectModal.addEventListener("click", closeEditSubjectModal);
if (btnCancelEditSubject) btnCancelEditSubject.addEventListener("click", closeEditSubjectModal);

if (editSubjectForm) {
  editSubjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = editSubjectCodeHidden.value;
    const name = editSubjectNameInput.value.trim();
    const targetGrade = editSubjectTargetInput ? editSubjectTargetInput.value.trim() : "";
    const startTime = editSubjectTimeInput.value || "09:00";
    const room = editSubjectRoomInput.value.trim();

    if (!code || !name) return;

    const btnConfirm = document.getElementById("btn-confirm-edit-subject");
    btnConfirm.disabled = true;
    btnConfirm.textContent = "กำลังบันทึก...";

    try {
      await update(ref(db, `subjects/${code}`), {
        name: name,
        targetGrade: targetGrade,
        defaultStartTime: startTime,
        room: room,
        updatedAt: Date.now(),
        updatedBy: currentTeacher?.email || "teacher"
      });
      closeEditSubjectModal();
    } catch (err) {
      console.error("Update subject error:", err);
      alert("เกิดข้อผิดพลาดในการแก้ไขวิชา: " + err.message);
    } finally {
      btnConfirm.disabled = false;
      btnConfirm.textContent = "💾 บันทึกการแก้ไข";
    }
  });
}
