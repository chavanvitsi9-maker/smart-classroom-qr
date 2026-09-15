/**
 * ============================================================================
 * Google Apps Script: Smart Classroom QR Attendance Sync
 * Sheet Name: smart-classroom-qr
 * Sheet ID: 1pUT4vYbxMP_re7eppyByzcKDtgCwkGRA9fSibH6Kk4s
 * ============================================================================
 * 
 * Instructions:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1pUT4vYbxMP_re7eppyByzcKDtgCwkGRA9fSibH6Kk4s
 * 2. Click Extensions > Apps Script (ส่วนขยาย > Apps Script)
 * 3. Replace all content in Code.gs with this file
 * 4. Click Save (บันทึก) and Run > onOpen (or refresh the Google Sheet)
 * 5. Use the "🎓 Smart Classroom" menu in the spreadsheet to sync data
 */

const CONFIG = {
  FIREBASE_DB_URL: "https://smart-classroom-qr-default-rtdb.asia-southeast1.firebasedatabase.app",
  SHEET_NAME: "smart-classroom-qr",
  SPREADSHEET_ID: "1pUT4vYbxMP_re7eppyByzcKDtgCwkGRA9fSibH6Kk4s"
};

/**
 * Creates custom menu when the spreadsheet is opened.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🎓 Smart Classroom")
    .addItem("🔄 ซิงค์ข้อมูลการเช็คชื่อ (Sync Attendance Now)", "syncAttendanceFromFirebase")
    .addSeparator()
    .addItem("⏱️ ตั้งเวลาซิงค์อัตโนมัติทุก 5 นาที (Enable Auto-Sync)", "setupAutoSyncTrigger")
    .addItem("🛑 ยกเลิกการตั้งเวลาซิงค์อัตโนมัติ (Disable Auto-Sync)", "clearAutoSyncTriggers")
    .addToUi();
}

/**
 * Main Function: Fetches attendance data from Firebase Realtime Database
 * and updates or appends rows into the target Google Sheet.
 */
function syncAttendanceFromFirebase() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // If sheet does not exist, create it
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }

  // Ensure Headers exist
  const headers = [
    "Record ID",
    "วันที่ (Date)",
    "รหัสนักศึกษา",
    "ชื่อ - นามสกุล",
    "รหัสวิชา",
    "ชื่อวิชา",
    "เวลาสแกน",
    "สถานะ (Status)",
    "มาสาย (นาที)",
    "หมายเหตุครูผู้สอน",
    "เวลาซิงค์ล่าสุด"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    formatHeaderRow(sheet);
  }

  // Fetch JSON data from Firebase RTDB REST API
  const endpoint = `${CONFIG.FIREBASE_DB_URL}/attendance.json`;
  let responseData = null;

  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: "get",
      muteHttpExceptions: true
    });
    
    const statusCode = response.getResponseCode();
    if (statusCode !== 200) {
      throw new Error(`HTTP Error ${statusCode}: ${response.getContentText()}`);
    }

    responseData = JSON.parse(response.getContentText());
  } catch (err) {
    Logger.log("Firebase fetch error: " + err.message);
    if (SpreadsheetApp.getActiveSpreadsheet()) {
      SpreadsheetApp.getUi().alert("❌ เกิดข้อผิดพลาดในการดึงข้อมูลจาก Firebase:\n" + err.message);
    }
    return;
  }

  if (!responseData) {
    Logger.log("No attendance data found in Firebase.");
    if (SpreadsheetApp.getActiveSpreadsheet()) {
      SpreadsheetApp.getUi().alert("ℹ️ ไม่พบข้อมูลการเช็คชื่อใน Firebase RTDB");
    }
    return;
  }

  // Load existing sheet keys to prevent duplicates (Column 1 is Record ID)
  const lastRow = sheet.getLastRow();
  const existingKeyRowMap = {};

  if (lastRow > 1) {
    const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    idColumnValues.forEach((row, index) => {
      const id = row[0];
      if (id) {
        existingKeyRowMap[id] = index + 2; // 1-indexed row number in Google Sheet
      }
    });
  }

  const syncTimestamp = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");
  const newRows = [];
  let updatedCount = 0;
  let insertedCount = 0;

  // Process each record from Firebase
  const records = Object.values(responseData);
  records.forEach((rec) => {
    const recordId = rec.id || `${rec.studentId}_${rec.subjectCode}_${rec.date}`;
    
    // Format scan time
    let scanTimeFormatted = "-";
    if (rec.scanTime) {
      try {
        const scanDate = new Date(rec.scanTime);
        scanTimeFormatted = Utilities.formatDate(scanDate, "Asia/Bangkok", "HH:mm:ss");
      } catch (e) {
        scanTimeFormatted = rec.scanTime;
      }
    }

    const rowData = [
      recordId,
      rec.date || "-",
      rec.studentId || "-",
      rec.studentName || "-",
      rec.subjectCode || "-",
      rec.subjectName || "-",
      scanTimeFormatted,
      rec.status || "OnTime",
      rec.minutesLate !== undefined ? rec.minutesLate : 0,
      rec.teacherNote || "-",
      syncTimestamp
    ];

    if (existingKeyRowMap[recordId]) {
      // Update existing row
      const targetRow = existingKeyRowMap[recordId];
      sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
      highlightStatusCell(sheet, targetRow, 8, rec.status);
      updatedCount++;
    } else {
      // Collect for batch appending
      newRows.push(rowData);
      insertedCount++;
    }
  });

  // Batch insert new rows
  if (newRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
    
    // Color status column for new rows
    newRows.forEach((row, idx) => {
      highlightStatusCell(sheet, startRow + idx, 8, row[7]);
    });
  }

  // Apply general table styling
  sheet.autoResizeColumns(1, headers.length);

  const summaryMsg = `✅ ซิงค์ข้อมูลสำเร็จ!\n- บันทึกใหม่: ${insertedCount} รายการ\n- อัปเดตข้อมูลเดิม: ${updatedCount} รายการ\nเวลาซิงค์: ${syncTimestamp}`;
  Logger.log(summaryMsg);

  if (SpreadsheetApp.getActiveSpreadsheet()) {
    SpreadsheetApp.getUi().alert(summaryMsg);
  }
}

/**
 * Formats the header row with Cyberpunk style dark theme colors.
 */
function formatHeaderRow(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, 11);
  headerRange.setBackground("#181824");
  headerRange.setFontColor("#00f3ff");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

/**
 * Highlights status cell with standard attendance colors.
 */
function highlightStatusCell(sheet, row, col, status) {
  const cell = sheet.getRange(row, col);
  cell.setHorizontalAlignment("center");
  cell.setFontWeight("bold");

  if (status === "OnTime") {
    cell.setBackground("#d1fae5"); // Soft Mint Green
    cell.setFontColor("#065f46");
  } else if (status === "Late") {
    cell.setBackground("#fef3c7"); // Soft Amber
    cell.setFontColor("#92400e");
  } else if (status === "Absent") {
    cell.setBackground("#fee2e2"); // Soft Red
    cell.setFontColor("#991b1b");
  }
}

/**
 * Sets up an automated time-driven trigger to run syncAttendanceFromFirebase every 5 minutes.
 */
function setupAutoSyncTrigger() {
  clearAutoSyncTriggers();
  ScriptApp.newTrigger("syncAttendanceFromFirebase")
    .timeBased()
    .everyMinutes(5)
    .create();

  SpreadsheetApp.getUi().alert("✅ ตั้งเวลาซิงค์อัตโนมัติเรียบร้อย!\nระบบจะดึงข้อมูลจาก Firebase มาอัปเดตชีตทุกๆ 5 นาที");
}

/**
 * Removes all time-driven triggers for syncAttendanceFromFirebase.
 */
function clearAutoSyncTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  triggers.forEach((trigger) => {
    if (trigger.getHandlerFunction() === "syncAttendanceFromFirebase") {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });

  if (SpreadsheetApp.getActiveSpreadsheet()) {
    SpreadsheetApp.getUi().alert(`🛑 ยกเลิกการซิงค์อัตโนมัติแล้ว (ลบ ${count} triggers)`);
  }
}
