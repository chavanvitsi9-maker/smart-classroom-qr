# 🚀 Smart Classroom QR Attendance System (Cyberpunk Cute Edition)

ระบบเช็คชื่อเข้าชั้นเรียนอัจฉริยะผ่าน **Dynamic Anti-Cheat QR Code** สไตล์ Cyberpunk Cute ผสาน **Firebase V9 Modular**, **html5-qrcode**, และระบบซิงค์ข้อมูลอัตโนมัติลง **Google Sheets**.

---

## 🎨 จุดเด่นและฟีเจอร์หลัก (Features)

1. **Cyberpunk Cute Design System**: 
   - ธีมสี Dark Mode (`#121218` ถึง `#1e1e2f`) ตกแต่งด้วยแสงไฟนีออนเรืองแสง Neon Cyan (`#00f3ff`) และ Neon Pink (`#ff007f`)
   - กระจกเงาโปร่งแสง (Glassmorphism UI) พร้อมมาสคอตแมวหุ่นยนต์สุดน่ารัก
   - ฟอนต์ไทย/อังกฤษทันสมัย: 'Sarabun' ผสมผสาน 'Orbitron'
2. **ระบบยืนยันตัวตน 2 รูปแบบ (Dual-Login in `index.html`)**:
   - **นักเรียน (Student)**: กรอก "รหัสนักเรียน" + "รหัสผ่าน" ระบบจะต่อท้ายโดเมนจำลอง `[studentID]@student.local` ให้อัตโนมัติเบื้องหลัง
   - **ครูผู้สอน (Teacher)**: ปุ่ม "Teacher Login (Google)" เข้าสู่ระบบด้วยบัญชี Google และตรวจสอบสิทธิ์อัตโนมัติก่อนเปิดหน้าแดชบอร์ด (`admin.html`)
3. **ระบบเช็คชื่อนักเรียน (`app.js`)**:
   - เลือกวิชาจากตาราง Grid สวยงาม
   - กล้องสแกน QR พร้อมกรอบเลเซอร์พัลส์นีออน (Viewfinder Pulse & Laser Scan)
   - **กติกาคำนวณเวลาเข้าเรียนอัตโนมัติ**:
     - สแกนภายใน `0 - 10 นาที`: **ตรงเวลา (OnTime)** ⚡
     - สแกนภายใน `11 - 20 นาที`: **มาสาย (Late)** ⚠️
     - สแกนเกิน `20 นาที`: **ขาดเรียน (Absent)** 🚫 (บล็อกการส่งข้อมูล)
   - ป้องกันการเช็คชื่อซ้ำ (Double Submission Guard) และบันทึกลง Firebase RTDB พาธ: `attendance/{studentId}_{subjectCode}_{date}`
   - หน้าต่างป๊อปอัปแสดงผลสำเร็จพร้อมเสียงกริ่งน่ารัก (Audio Chime)
4. **แดชบอร์ดสำหรับอาจารย์ (`admin.html` & `admin.js`)**:
   - **Dynamic QR Generator**: สร้าง QR Code ป้องกันการโกง มีโทเค็นและ Timestamp รีเฟรชโค้ดใหม่ทุกๆ 30 วินาที พร้อมแถบเวลานับถอยหลัง
   - **Projector Mode**: ปุ่มสลับหน้าจอใหญ่เต็มตาสำหรับฉายโปรเจกเตอร์ในห้องเรียน
   - **Realtime Monitor & Stats**: แสดงจำนวนนักเรียนที่เข้าเรียน, ตรงเวลา, มาสาย, ขาดเรียน อัปเดตแบบสดๆ
   - **Retroactive Edit**: คลิกที่แถวเพื่อแก้ไขสถานะการเช็คชื่อย้อนหลัง (เช่น เปลี่ยนจากสายเป็นตรงเวลา หรือใส่หมายเหตุการลา)
   - **Student Management**: ฟอร์มลงทะเบียนนักเรียนใหม่ โดยใช้ Secondary Firebase App เบื้องหลัง ทำให้ครูผู้สอนไม่ถูกล็อกเอาท์ออกจากระบบ
5. **รองรับ PWA (Progressive Web App)**:
   - มีไฟล์ `manifest.json` และ `sw.js` ติดตั้งลงหน้าจอโฮมของมือถือได้ (Add to Home Screen)
6. **Google Sheets Sync (`Code.gs`)**:
   - ซิงค์ข้อมูลจาก Firebase Realtime Database ลง Google Sheet อัตโนมัติ ป้องกันข้อมูลซ้ำ และตั้งเวลาซิงค์ทุก 5 นาทีได้

---

## 📁 โครงสร้างโปรเจกต์ (File Structure)

```
d:/Project เช็คชื่อนักเรียน/
├── index.html              # หน้า Dual-Login และหน้าเช็คชื่อสำหรับนักเรียน
├── admin.html              # แดชบอร์ดควบคุมของอาจารย์ผู้สอน
├── style.css               # สไตล์ชีตรวม Cyberpunk Cute + Glassmorphism
├── firebase-init.js        # กำหนดค่า Firebase V9 และสร้าง Auth Account นักเรียน
├── app.js                  # ลอจิกฝั่งนักเรียน (กล้องสแกน, ตรวจสอบเวลา, บันทึก RTDB)
├── admin.js                # ลอจิกฝั่งอาจารย์ (QR 30 วิ, กรองข้อมูล, แก้ไขย้อนหลัง, จัดการนักเรียน)
├── manifest.json           # การตั้งค่า PWA Web App Manifest
├── sw.js                   # Service Worker จัดการ Offline Caching
├── Code.gs                 # Google Apps Script ซิงค์ข้อมูลลง Google Sheets
├── database.rules.json     # กฎความปลอดภัย Firebase Realtime Database
└── assets/
    ├── chibi-placeholder.png # มาสคอตหลัก Cyberpunk Cute Robot Cat
    ├── icon-192.png        # ไอคอน PWA 192x192
    └── icon-512.png        # ไอคอน PWA 512x512
```

---

## ⚙️ ขั้นตอนการตั้งค่า Firebase (Firebase Setup)

### 1. เปิดใช้งาน Authentication
1. ไปที่ [Firebase Console](https://console.firebase.google.com/) เลือกโปรเจกต์ `smart-classroom-qr`
2. เมนู **Build > Authentication > Sign-in method**:
   - เปิดใช้งาน **Email/Password**
   - เปิดใช้งาน **Google**
3. **อนุญาตอีเมลอาจารย์ผู้สอน**:
   - ในไฟล์ `firebase-init.js` บรรทัดที่ 33:
     ```javascript
     export const ALLOWED_TEACHER_EMAILS = [
       "teacher@example.com",
       "youremail@gmail.com" // 👈 เพิ่มอีเมล Google ของคุณที่นี่
     ];
     ```

### 2. ตั้งค่ากฎความปลอดภัย Realtime Database
1. ไปที่ **Build > Realtime Database > Rules**
2. คัดลอกเนื้อหาจากไฟล์ `database.rules.json` ไปวาง แล้วกด **Publish**

---

## 📊 ขั้นตอนการตั้งค่า Google Sheets (`Code.gs`)

1. เปิดสเปรดชีตของคุณ: [smart-classroom-qr](https://docs.google.com/spreadsheets/d/1pUT4vYbxMP_re7eppyByzcKDtgCwkGRA9fSibH6Kk4s)
2. ไปที่เมนู **ส่วนขยาย (Extensions) > Apps Script**
3. ลบโค้ดเดิมใน `Code.gs` แล้วนำโค้ดจากไฟล์ `Code.gs` ในโปรเจกต์นี้ไปวางแทนที่
4. กด **บันทึก (Save 💾)**
5. กลับไปที่หน้า Google Sheet แล้วรีเฟรชหน้าเว็บ 1 ครั้ง จะปรากฏเมนูใหม่:
   - `🎓 Smart Classroom > 🔄 ซิงค์ข้อมูลการเช็คชื่อ (Sync Attendance Now)`
   - หรือเลือก `⏱️ ตั้งเวลาซิงค์อัตโนมัติทุก 5 นาที (Enable Auto-Sync)` เพื่อให้ระบบดึงข้อมูลอัตโนมัติตลอดเวลา

---

## 💻 วิธีการเปิดรันโปรเจกต์ (How to Run)

เนื่องจากระบบใช้ ES6 Modules (`import / export`) และเรียกใช้งานกล้องเว็บแคมผ่านเบราว์เซอร์ จำเป็นต้องเปิดผ่าน Web Server (ห้ามดับเบิลคลิกไฟล์ HTML เปิดตรงๆ ด้วย `file://`):

### ตัวเลือกที่ 1: ใช้ VS Code Live Server (แนะนำที่สุด)
1. เปิดโฟลเดอร์โปรเจกต์ใน VS Code
2. คลิกขวาที่ไฟล์ `index.html` แล้วเลือก **Open with Live Server**
3. เว็บจะเปิดขึ้นที่ `http://127.0.0.1:5500/index.html`

### ตัวเลือกที่ 2: ใช้ Python หรือ Node.js Server
- หากมี Python:
  ```bash
  python -m http.server 8080
  ```
  จากนั้นเปิดเบราว์เซอร์ไปที่ `http://localhost:8080`

- หากมี npx:
  ```bash
  npx serve .
  ```

---

## 🧪 ขั้นตอนการทดสอบระบบ (Testing Workflow)

1. **เข้าใช้งานครั้งแรก**:
   - เปิดหน้าเว็บ เข้าสู่แท็บ **👩‍🏫 ครูผู้สอน** แล้วกด **Teacher Login (Google)**
   - ระบบจะเปิดหน้า `admin.html`
2. **สร้างบัญชีนักเรียนทดสอบ**:
   - ไปที่แท็บ **👥 จัดการข้อมูลนักเรียน**
   - กรอกรหัสนักเรียน เช่น `6501001`, ชื่อ `สมชาย ใจดี`, ห้อง `CS-01`, รหัสผ่าน `123456`
   - กดบันทึก (ระบบจะลงทะเบียน Auth โดยไม่ออกจากระบบของอาจารย์)
3. **เปิด Dynamic QR Code**:
   - ไปที่แท็บ **⚡ สร้าง Dynamic QR Code**
   - เลือกวิชาและเวลาเริ่มเรียน จะเห็น QR Code สดใหม่พร้อมเวลานับถอยหลัง 30 วินาที
4. **ทดสอบการสแกนด้วยบัญชีนักเรียน**:
   - เปิดหน้าต่างใหม่ (Incognito / มือถือ) ไปที่ `index.html`
   - ล็อกอินด้วยรหัส `6501001` และรหัสผ่าน `123456`
   - เลือกวิชา แล้วกด **📷 เปิดกล้องสแกน**
   - สแกน QR บนหน้าจออาจารย์ ระบบจะคำนวณสถานะ บันทึกลงฐานข้อมูล และเล่นเสียง Chime ฉลองความสำเร็จ!
