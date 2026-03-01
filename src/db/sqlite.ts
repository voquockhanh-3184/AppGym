import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

let db: SQLiteDatabase | null = null;

// ======================
// 📝 TYPESCRIPT DEFINITIONS
// ======================
export interface RegisteredCourse {
  course_id: number;
  course_title: string;
  user_name: string;
  amount: number;
  created_at: string;
  is_rated: boolean; 
  pt_name: string; 
  image: string;            
  attended_sessions: number; 
  total_sessions: number;    
  can_rate: boolean;        
  start_date?: string;
  end_date?: string;
  facility?: string;
  description?: string;
  price?: number;
}

// ======================
// 🔧 CORE DATABASE FUNCTIONS
// ======================

export async function openDB(name = 'appgym.db') {
  if (db) return db;
  try {
    db = await SQLite.openDatabase({ name, location: 'default' });
    return db;
  } catch (e) {
    console.error('Failed to open DB', e);
    throw e;
  }
}

export async function closeDB() {
  if (!db) return;
  try {
    await db.close();
    db = null;
  } catch (e) {
    console.warn('Failed to close DB', e);
  }
}

// Hàm wrapper chung cho các truy vấn SELECT/INSERT/UPDATE thông thường
export async function executeSql(sql: string, params: any[] = []) {
  const database = await openDB();
  try {
    const [result] = await database.executeSql(sql, params);
    return result;
  } catch (e: any) {
    // Chỉ in lỗi nếu KHÔNG phải là lỗi duplicate column (để tránh rác log)
    if (!e.message?.includes('duplicate column') && !e.message?.includes('UNIQUE constraint failed')) {
        console.error('executeSql error', sql, e);
    }
    throw e;
  }
}

export const getCurrentUserId = async () => {
  try {
    const id = await AsyncStorage.getItem('currentUserId');
    return id;
  } catch (e) {
    console.warn('Error getting currentUserId:', e);
    return null;
  }
};

// ======================
// 📦 INITIALIZE DATABASE (CREATE TABLES)
// ======================
export async function initDB() {
  const db = await openDB();
  console.log("🚀 Starting initDB...");

  const tables = [
    `CREATE TABLE IF NOT EXISTS gym_branch (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, address TEXT, latitude REAL DEFAULT 0, longitude REAL DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, address TEXT, phone TEXT, createdAt INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS personal_trainers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, phone TEXT, specialty TEXT, experience INTEGER, photo TEXT, createdAt INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT, date TEXT, className TEXT, ptName TEXT, facility TEXT, 
      user_id INTEGER, course_id INTEGER, createdAt INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT, title TEXT, time TEXT, difficulty TEXT, exerciseCount INTEGER, 
      image TEXT, createdAt INTEGER, video_path TEXT, user_id INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT, email TEXT UNIQUE, username TEXT, gender TEXT, age INTEGER, 
      height REAL, weight REAL, password TEXT, role TEXT, photoURL TEXT, createdAt INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS sub_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT,
      detail TEXT,
      video_path TEXT,
      reps INTEGER DEFAULT 10,
      time TEXT DEFAULT '00:20',
      type TEXT DEFAULT 'rep',
      order_index INTEGER DEFAULT 0,
      instruction TEXT, 
      focus_area TEXT,
      muscle_image TEXT,
      instruction_video TEXT,
      createdAt INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS sub_exercises_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, detail TEXT, image TEXT, reps INTEGER DEFAULT 10, sets INTEGER DEFAULT 3, createdAt INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, description TEXT, image TEXT, ptName TEXT, facility TEXT, price REAL, 
      sessions INTEGER, startDate TEXT, endDate TEXT, schedule TEXT, createdAt INTEGER, isVisible INTEGER DEFAULT 1
    );`,
    `CREATE TABLE IF NOT EXISTS weight_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER, weight REAL NOT NULL, date TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER, 
      exercise_id INTEGER, 
      title TEXT, 
      date TEXT NOT NULL, 
      duration INTEGER, 
      calories INTEGER, 
      exercises TEXT, 
      image TEXT,
      createdAt INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, image TEXT, isVisible INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER, course_title TEXT, user_id INTEGER, user_name TEXT, amount REAL, payment_method TEXT, created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS attendance (
      class_id INTEGER, user_id INTEGER, status TEXT, date TEXT, PRIMARY KEY (class_id, user_id)
    );`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE
    );`,
    `CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      course_id INTEGER,
      course_name TEXT,
      rating INTEGER,
      comment TEXT,
      created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS pt_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      pt_name TEXT,
      rating INTEGER,
      comment TEXT,
      created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      message TEXT,
      type TEXT,
      user_id INTEGER, 
      is_read INTEGER DEFAULT 0,
      created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id TEXT, 
      user_id INTEGER,
      created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS workout_progress (
      exercise_id TEXT PRIMARY KEY, 
      current_index INTEGER, 
      updated_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS feature_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      content TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER,
      receiver_id INTEGER,
      content TEXT,
      type TEXT DEFAULT 'text',
      created_at TEXT
    );`,
    // --- ✅ BẢNG COUPONS ---
    `CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        percent INTEGER NOT NULL,
        description TEXT,
        expiry_date TEXT,
        usage_limit INTEGER DEFAULT 1,    
        usage_count INTEGER DEFAULT 0,    
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
  ];

  // Chạy lệnh tạo bảng
  for (const query of tables) {
    try {
        await db.executeSql(query);
    } catch (e) {
        console.warn("Init table error (ignored):", e);
    }
  }

  // MIGRATIONS
  try {
    await safeAddColumn(db, 'personal_trainers', 'phone', 'TEXT');
    await safeAddColumn(db, 'gym_branch', 'latitude', 'REAL DEFAULT 0');
    await safeAddColumn(db, 'gym_branch', 'longitude', 'REAL DEFAULT 0');
    await safeAddColumn(db, 'courses', 'schedule', 'TEXT');
    await safeAddColumn(db, 'courses', 'isForceOpen', 'INTEGER DEFAULT 0'); 
    await safeAddColumn(db, 'classes', 'user_id', 'INTEGER');
    await safeAddColumn(db, 'classes', 'course_id', 'INTEGER');
    await safeAddColumn(db, 'sub_exercises', 'reps', 'INTEGER DEFAULT 10');
    await safeAddColumn(db, 'sub_exercises', 'time', "TEXT DEFAULT '00:20'");
    await safeAddColumn(db, 'sub_exercises', 'type', "TEXT DEFAULT 'rep'");
    await safeAddColumn(db, 'sub_exercises', 'order_index', 'INTEGER DEFAULT 0');
    await safeAddColumn(db, 'sub_exercises', 'instruction', 'TEXT');
    await safeAddColumn(db, 'sub_exercises', 'focus_area', 'TEXT');
    await safeAddColumn(db, 'sub_exercises', 'muscle_image', 'TEXT');
    await safeAddColumn(db, 'sub_exercises', 'instruction_video', 'TEXT');
    await safeAddColumn(db, 'notifications', 'user_id', 'INTEGER');
    await safeAddColumn(db, 'workout_logs', 'user_id', 'INTEGER');
    await safeAddColumn(db, 'workout_sessions', 'exercise_id', 'INTEGER');
    await safeAddColumn(db, 'workout_sessions', 'image', 'TEXT');
    await safeAddColumn(db, 'exercises', 'video_path', 'TEXT');
    await safeAddColumn(db, 'exercises', 'user_id', 'INTEGER');
    await safeAddColumn(db, 'messages', 'type', "TEXT DEFAULT 'text'"); 
    
    // Migration cho Coupons
    await safeAddColumn(db, 'coupons', 'expiry_date', 'TEXT');
    await safeAddColumn(db, 'coupons', 'is_active', 'INTEGER DEFAULT 1');
    await safeAddColumn(db, 'coupons', 'usage_limit', 'INTEGER DEFAULT 1'); 
    await safeAddColumn(db, 'coupons', 'usage_count', 'INTEGER DEFAULT 0'); 

  } catch (err) {
    console.warn("Migration warning:", err);
  }

  console.log("✅ initDB completed successfully.");
}

// ✅ HÀM HELPERS: Đã sửa lại để không bao giờ throw lỗi duplicate
async function safeAddColumn(db: SQLiteDatabase, tableName: string, columnName: string, columnType: string) {
  try {
    // Cố gắng thêm cột mới
    await db.executeSql(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
    console.log(`✅ Added column ${columnName} to table ${tableName}`);
  } catch (error: any) {
    const errorMsg = error.message || JSON.stringify(error);
    if (errorMsg.includes('duplicate column') || errorMsg.includes('SQLITE_ERROR[1]')) return; 
    console.warn(`⚠️ Could not add column ${columnName}:`, errorMsg);
  }
}

// ==================================================
// 🚑 CÁC HÀM XỬ LÝ TRÙNG LẶP DỮ LIỆU (MỚI THÊM)
// ==================================================

// ✅ HÀM DỌN DẸP DỮ LIỆU TRÙNG VÀ TẠO RÀNG BUỘC CHO BẢNG CLASSES
export const fixDuplicateClasses = async () => {
    try {
      const db = await openDB(); 
      console.log("🔄 Đang quét và xóa lớp học trùng lặp trong bảng classes...");
  
      // 1. Xóa các dòng trùng lặp (Giữ lại dòng có ID nhỏ nhất)
      await db.executeSql(`
        DELETE FROM classes
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM classes
          GROUP BY course_id, date, time, className
        )
      `);
      
      console.log("✅ Đã xóa các lớp trùng nhau.");
  
      // 2. Tạo chỉ mục duy nhất (Unique Index) để ngăn chặn trùng lặp trong tương lai
      await db.executeSql(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_class
        ON classes (course_id, date, time, className)
      `);
      
      console.log("✅ Đã tạo khóa chống trùng lặp thành công cho bảng classes.");
  
    } catch (error) {
      console.error("❌ Lỗi khi sửa DB (fixDuplicateClasses):", error);
    }
};

// ======================
// 🗂️ CATEGORY MANAGEMENT
// ======================
export async function getAllCategories() {
  const res = await executeSql("SELECT * FROM categories ORDER BY id ASC");
  const rows: any[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
}
export async function addCategory(name: string) { try { await executeSql("INSERT INTO categories (name) VALUES (?)", [name]); return true; } catch (e) { return false; } }

// ======================
// 🧱 GYM BRANCH MANAGEMENT
// ======================
export async function getAllGymBranches() { const res = await executeSql(`SELECT * FROM gym_branch ORDER BY id DESC`); const list: any[] = []; for (let i = 0; i < res.rows.length; i++) list.push(res.rows.item(i)); return list; }
export async function getGymBranchesLocal() { return await getAllGymBranches(); }
export async function insertGymBranch(name: string, address: string, latitude: number, longitude: number) { await executeSql(`INSERT INTO gym_branch (name, address, latitude, longitude) VALUES (?, ?, ?, ?)`, [name, address, latitude || 0, longitude || 0]); }
export async function updateGymBranch(id: number, name: string, address: string, latitude: number, longitude: number) { await executeSql(`UPDATE gym_branch SET name = ?, address = ?, latitude = ?, longitude = ? WHERE id = ?`, [name, address, latitude || 0, longitude || 0, id]); }
export async function deleteGymBranch(id: number) { await executeSql(`DELETE FROM gym_branch WHERE id = ?`, [id]); }
export async function createGymBranchTable() { }

// ======================
// 💰 PAYMENT & REGISTRATION MANAGEMENT
// ======================
export async function addPayment(paymentData: any) { const sql = `INSERT INTO payments (course_id, course_title, user_id, user_name, amount, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`; await executeSql(sql, [paymentData.course_id, paymentData.course_title, paymentData.user_id, paymentData.user_name, paymentData.amount, paymentData.payment_method, paymentData.created_at || new Date().toISOString()]); }
export async function getRevenueReport(filter: 'week' | 'month' | 'all') { let sql = "SELECT * FROM payments"; const params: any[] = []; const now = new Date(); if (filter === 'week') { const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); sql += " WHERE created_at >= ?"; params.push(lastWeek.toISOString()); } else if (filter === 'month') { const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); sql += " WHERE created_at >= ?"; params.push(lastMonth.toISOString()); } sql += " ORDER BY created_at DESC"; const res = await executeSql(sql, params); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); return rows; }

export async function checkUserRegistration(userId: number, courseId: number) {
  const sql = `SELECT id FROM payments WHERE user_id = ? AND course_id = ? LIMIT 1`;
  const res = await executeSql(sql, [userId, courseId]);
  return res.rows.length > 0;
}

export async function cancelRegistration(userId: number, courseId: number) {
  try {
    await executeSql(`DELETE FROM payments WHERE user_id = ? AND course_id = ?`, [userId, courseId]);
    await executeSql(`DELETE FROM classes WHERE user_id = ? AND course_id = ?`, [userId, courseId]);
    return true;
  } catch (e) {
    console.error("Lỗi hủy đăng ký:", e);
    return false;
  }
}

export async function getReviewsByPT(ptName: string) {
  const sql = `
    SELECT r.*, u.username, u.photoURL 
    FROM pt_reviews r 
    JOIN users u ON r.user_id = u.id 
    WHERE r.pt_name = ? 
    ORDER BY r.created_at DESC
  `;
  const res = await executeSql(sql, [ptName]);
  const rows: any[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
}

// ======================
// 📝 ATTENDANCE MANAGEMENT
// ======================
export async function getClassAttendance(classId: number) { const sql = `SELECT u.id, u.username as name, u.photoURL, a.status FROM attendance a JOIN users u ON a.user_id = u.id WHERE a.class_id = ? ORDER BY u.username ASC;`; const res = await executeSql(sql, [classId]); const students: any[] = []; for (let i = 0; i < res.rows.length; i++) students.push(res.rows.item(i)); return students; }
export async function updateAttendanceStatus(classId: number, userId: number, status: string) { const sql = `INSERT OR REPLACE INTO attendance (class_id, user_id, status, date) VALUES (?, ?, ?, datetime('now', 'localtime'));`; await executeSql(sql, [classId, userId, status]); }

// ======================
// 🏋️ CLASS MANAGEMENT
// ======================
export async function getClassesLocal(userId: string | number | null = null, role: string = 'user', ptName: string = '') {
  let sql = `
    SELECT classes.*, courses.title as course_title
    FROM classes
    LEFT JOIN courses ON classes.course_id = courses.id
    WHERE (courses.isVisible = 1 OR courses.id IS NULL) 
  `; 
  
  let params: any[] = [];

  if (role === 'admin') {
    sql += ' ORDER BY classes.createdAt DESC';
  } else if (role === 'trainer') {
    sql += ' AND classes.ptName = ? ORDER BY classes.createdAt DESC';
    params.push(ptName);
  } else {
    if (userId) {
      sql += ' AND classes.user_id = ? ORDER BY classes.createdAt DESC';
      params.push(userId);
    } else {
      sql += ' ORDER BY classes.createdAt DESC';
    }
  }

  const res = await executeSql(sql, params);
  const rows: any[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
}

// ✅ ĐÃ SỬA: Dùng INSERT OR IGNORE để tránh lỗi nếu bị trùng lặp
export async function addClassLocal(classData: any) {
  const courseId = classData.courseId || classData.course_id;
  const className = classData.className;
  const ptName = classData.ptName;
  const date = classData.date;
  const time = classData.time;
  const facility = classData.facility;
  const userId = classData.user_id || null;
  const createdAt = Date.now();
  
  const sql = `INSERT OR IGNORE INTO classes (course_id, className, ptName, date, time, facility, user_id, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
  const res = await executeSql(sql, [courseId, className, ptName || '', date, time, facility || '', userId, createdAt]);
  return res.insertId;
}

export async function getTrainerSchedule(ptName: string) {
  try {
    const query = `
        SELECT * FROM classes 
        WHERE ptName = ? 
        AND user_id IS NULL   
        GROUP BY date, time, className 
        ORDER BY 
            substr(date, 7, 4) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2) DESC, 
            time ASC
    `;
    
    const results = await executeSql(query, [ptName]);
    
    let classes = [];
    for (let i = 0; i < results.rows.length; i++) {
        classes.push(results.rows.item(i));
    }
    return classes;
  } catch (error) {
    console.error("Lỗi lấy lịch dạy:", error);
    return [];
  }
}

// ======================
// 🎓 COURSE MANAGEMENT
// ======================
export async function addCourseLocal(course: any) { 
  const createdAt = Date.now(); 
  const sql = `INSERT INTO courses (title, description, image, ptName, facility, price, sessions, startDate, endDate, schedule, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`; 
  const params = [course.title, course.description ?? "", course.image ?? "", course.ptName ?? "", course.facility ?? "", course.price ?? 0, course.sessions ?? 0, course.startDate ?? null, course.endDate ?? null, course.schedule ?? "", createdAt]; 
  const res = await executeSql(sql, params); 
  return res.insertId; 
}
export async function getCoursesLocal() { const sql = `SELECT * FROM courses ORDER BY createdAt DESC;`; const res = await executeSql(sql, []); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); return rows; }
export async function getVisibleCoursesLocal() { const sql = `SELECT * FROM courses WHERE isVisible = 1 ORDER BY createdAt DESC;`; const res = await executeSql(sql, []); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); return rows; }

export async function deleteCourseLocal(id: number | string) { 
  await executeSql("DELETE FROM classes WHERE course_id = ?", [id]); 
  await executeSql("DELETE FROM courses WHERE id = ?", [id]); 
}

export async function updateCourseVisibility(id: number, visible: boolean, isForceOpen: boolean = false) { 
    const forceVal = visible && isForceOpen ? 1 : 0;
    await executeSql(
        `UPDATE courses SET isVisible = ?, isForceOpen = ? WHERE id = ?`, 
        [visible ? 1 : 0, forceVal, id]
    ); 
}

export async function autoCloseExpiredCourses() {
  try {
    const now = new Date();
    const res = await executeSql(
      "SELECT id, startDate, endDate, title FROM courses WHERE isVisible = 1 AND (isForceOpen = 0 OR isForceOpen IS NULL)"
    );

    const promises = [];

    for (let i = 0; i < res.rows.length; i++) {
      const item = res.rows.item(i);
      const dateToCheck = item.endDate ? new Date(item.endDate) : (item.startDate ? new Date(item.startDate) : null);

      if (dateToCheck && dateToCheck <= now) {
        console.log(`🔒 Auto closing course: ${item.title} (Ended: ${item.endDate || item.startDate})`);
        promises.push(
          executeSql("UPDATE courses SET isVisible = 0 WHERE id = ?", [item.id])
        );
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      return true;
    }
    return false;
  } catch (e) {
    console.error("❌ Auto close error:", e);
    return false;
  }
}

// ======================
// 🔔 NOTIFICATION MANAGEMENT
// ======================
export async function addNotification(title: string, message: string, type: string = 'system', userId: number | null = null) {
  const createdAt = new Date().toISOString(); 
  await executeSql(
    `INSERT INTO notifications (title, message, type, user_id, is_read, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
    [title, message, type, userId, createdAt]
  );
}

// 2. Lấy TẤT CẢ thông báo của User (Dùng cho màn hình Thông báo)
export async function getNotificationsByUserId(userId: number) {
  const sql = `
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `;
  const res = await executeSql(sql, [userId]);
  const rows: any[] = [];
  for (let i = 0; i < res.rows.length; i++) {
    rows.push(res.rows.item(i));
  }
  return rows;
}

// 3. Đếm số thông báo chưa đọc (Dùng cho Badge ở Header)
export async function countUnreadNotifications(userId: number) {
  const sql = `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`;
  const res = await executeSql(sql, [userId]);
  if (res.rows.length > 0) return res.rows.item(0).count;
  return 0;
}

// 4. Đánh dấu 1 thông báo là đã đọc
export async function markNotificationAsRead(id: number) {
  await executeSql(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
}

// 5. Đánh dấu TẤT CẢ là đã đọc
export async function markAllNotificationsAsRead(userId: number) {
  await executeSql(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
}

// 6. Xóa 1 thông báo
export async function deleteNotification(id: number) {
  await executeSql(`DELETE FROM notifications WHERE id = ?`, [id]);
}

// 7. Xóa TẤT CẢ thông báo của User
export async function deleteAllNotifications(userId: number) {
  await executeSql(`DELETE FROM notifications WHERE user_id = ?`, [userId]);
}

export async function getUnreadNotifications() {
  const sql = `
    SELECT n.*, u.username, u.photoURL, u.email 
    FROM notifications n
    LEFT JOIN users u ON n.user_id = u.id
    WHERE n.is_read = 0 
    ORDER BY n.created_at DESC
  `;
  const res = await executeSql(sql);
  const rows = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
}

export async function markNotificationsAsRead() {
  await executeSql(`UPDATE notifications SET is_read = 1 WHERE is_read = 0`);
}




// ======================
// 💡 FEATURE REQUESTS MANAGEMENT
// ======================
export async function addFeatureRequest(userId: number, username: string, content: string, isAnonymous: boolean) {
  const createdAt = new Date().toISOString();
  const finalUsername = isAnonymous ? "Người dùng ẩn danh" : username;
  await executeSql(
    `INSERT INTO feature_requests (user_id, username, content, created_at) VALUES (?, ?, ?, ?)`,
    [userId, finalUsername, content, createdAt]
  );
}

export async function getAllFeatureRequests() {
  const res = await executeSql(`SELECT * FROM feature_requests ORDER BY created_at DESC`);
  const rows: any[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
}

// ======================
// 🔥 WORKOUT LOGS & PROGRESS MANAGEMENT
// ======================
export const saveWorkoutLog = async (exerciseId: string, userId: number | null = null) => {
  try {
    const date = new Date().toISOString();
    await executeSql(
      `INSERT INTO workout_logs (exercise_id, user_id, created_at) VALUES (?, ?, ?);`,
      [exerciseId, userId, date]
    );
  } catch (e) {
    console.error("❌ Error saving workout log", e);
  }
};

export const getLastWorkoutLog = async (exerciseId: string) => {
  try {
    const results = await executeSql(
      `SELECT created_at FROM workout_logs WHERE exercise_id = ? ORDER BY id DESC LIMIT 1;`,
      [exerciseId]
    );
    if (results.rows.length > 0) return results.rows.item(0).created_at;
    return null;
  } catch (e) {
    console.error("❌ Error fetching last log", e);
    return null;
  }
};

export const getAllLastLogs = async (userId: number) => {
  try {
    const results = await executeSql(
      `SELECT exercise_id, MAX(created_at) as lastDate FROM workout_logs WHERE user_id = ? GROUP BY exercise_id`,
      [userId]
    );
    const logs: Record<string, string> = {};
    for (let i = 0; i < results.rows.length; i++) {
        const item = results.rows.item(i);
        logs[item.exercise_id] = item.lastDate;
    }
    return logs;
  } catch (error) {
    console.error("Error in getAllLastLogs:", error);
    return {};
  }
};

export const saveWorkoutProgress = async (exerciseId: string, currentIndex: number) => {
  try {
    const date = new Date().toISOString();
    await executeSql(
      `INSERT OR REPLACE INTO workout_progress (exercise_id, current_index, updated_at) VALUES (?, ?, ?);`,
      [exerciseId, currentIndex, date]
    );
  } catch (e) {
    console.error("❌ Error saving progress", e);
  }
};

export const getWorkoutProgress = async (exerciseId: string) => {
  try {
    const results = await executeSql(
      `SELECT current_index FROM workout_progress WHERE exercise_id = ?;`,
      [exerciseId]
    );
    if (results.rows.length > 0) return results.rows.item(0).current_index;
    return 0;
  } catch (e) {
    return 0;
  }
};

export const deleteWorkoutProgress = async (exerciseId: string) => {
  try {
    await executeSql(`DELETE FROM workout_progress WHERE exercise_id = ?;`, [exerciseId]);
  } catch (e) {
    console.error(e);
  }
};

// ======================
// 👤 USER & OTHER
// ======================
export async function createUserLocal(user: any) { const createdAt = Date.now(); const sql = `INSERT INTO users (uid, email, username, gender, height, weight, password, role, photoURL, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`; const res = await executeSql(sql, [user.uid || '', user.email, user.username, user.gender || '', user.height || 0, user.weight || 0, user.password, user.role || 'user', user.photoURL || '', createdAt]); return res.insertId; }
export async function getUserByEmailLocal(email: string) { const res = await executeSql('SELECT * FROM users WHERE email = ? LIMIT 1', [email]); if (res.rows.length > 0) return res.rows.item(0); return null; }
export async function validateUserLocal(email: string, password: string) { const user = await getUserByEmailLocal(email); if (!user) return null; return user.password === password ? user : null; }
export async function getAllUsersLocal() { const res = await executeSql('SELECT * FROM users ORDER BY createdAt DESC'); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push({ ...res.rows.item(i), id: String(res.rows.item(i).id) }); return rows; }
export async function updateUserRoleLocal(userId: number | string, newRole: string) { await executeSql('UPDATE users SET role = ? WHERE id = ?', [newRole, userId]); }
export async function deleteUserLocal(userId: number | string) { await executeSql('DELETE FROM users WHERE id = ?', [userId]); }

export async function getAllTrainers() { const res = await executeSql("SELECT * FROM personal_trainers ORDER BY id DESC"); const list: any[] = []; for (let i = 0; i < res.rows.length; i++) list.push(res.rows.item(i)); return list; }
export async function addTrainer(name: string, phone: string, specialty: string) { const createdAt = Date.now(); await executeSql(`INSERT INTO personal_trainers (name, phone, specialty, experience, photo, createdAt) VALUES (?, ?, ?, ?, ?, ?)`, [name, phone, specialty, 0, "", createdAt]); }
export async function updateTrainer(id: number, name: string, phone: string, specialty: string) { await executeSql(`UPDATE personal_trainers SET name = ?, phone = ?, specialty = ? WHERE id = ?`, [name, phone, specialty, id]); }
export async function deleteTrainer(id: number) { await executeSql("DELETE FROM personal_trainers WHERE id = ?", [id]); }

export async function addWeightRecordLocal(userId: number, weight: number) { const now = new Date(); const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000); const vnDateStr = vnNow.toISOString().slice(0, 19).replace("T", " "); await executeSql("INSERT INTO weight_history (user_id, weight, date) VALUES (?, ?, ?)", [userId, weight, vnDateStr]); }
export async function getWeightHistoryLocal(userId: number) { const res = await executeSql("SELECT * FROM weight_history WHERE user_id = ? ORDER BY datetime(date) ASC", [userId]); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); return rows; }

export const addWorkoutSession = async (
  userId: number, 
  title: string, 
  duration: number, 
  calories: number, 
  exercises: any[] | string,
  imageUrl: string = "", 
  exerciseId: number | null = null
) => {
  try {
    const db = await openDB(); 
    const dateStr = new Date().toISOString();
    const exercisesJson = typeof exercises === 'string' ? exercises : JSON.stringify(exercises);
    const query = `
      INSERT INTO workout_sessions (user_id, exercise_id, title, duration, calories, exercises, date, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.executeSql(query, [
      userId, 
      exerciseId,
      title, 
      duration, 
      calories, 
      exercisesJson, 
      dateStr, 
      imageUrl 
    ]);
  } catch (error) {
    console.error("❌ Error adding session", error);
  }
};

export async function countPendingFeatureRequests() {
  const res = await executeSql(`SELECT COUNT(*) as count FROM feature_requests WHERE status = 'pending'`);
  if (res.rows.length > 0) return res.rows.item(0).count;
  return 0;
}

export async function markAllFeatureRequestsAsRead() {
  await executeSql(`UPDATE feature_requests SET status = 'read' WHERE status = 'pending'`);
}

export async function getWorkoutSessionsLocal(userId: number | null = null) { 
    const sql = userId 
        ? `SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY datetime(date) DESC` 
        : `SELECT * FROM workout_sessions ORDER BY datetime(date) DESC`; 
    const params = userId ? [userId] : []; 
    const res = await executeSql(sql, params); 
    const rows: any[] = []; 
    for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); 
    return rows; 
}

export async function getWorkoutSessionsByDateRange(userId: number, startIso: string, endIso: string) { const sql = `SELECT * FROM workout_sessions WHERE user_id = ? AND datetime(date) >= datetime(?) AND datetime(date) <= datetime(?) ORDER BY datetime(date) ASC`; const res = await executeSql(sql, [userId, startIso, endIso]); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); return rows; }
export async function getWorkoutSessionsForWeek(userId: number, dateIso?: string) { const now = dateIso ? new Date(dateIso) : new Date(); const day = now.getDay(); const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - day); startOfWeek.setHours(0, 0, 0, 0); const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23, 59, 59, 999); const startIso = startOfWeek.toISOString().slice(0, 19).replace("T", " "); const endIso = endOfWeek.toISOString().slice(0, 19).replace("T", " "); return await getWorkoutSessionsByDateRange(userId, startIso, endIso); }
export async function createBannerTable() { }
export async function addBannerLocal(title: string, image: string, isVisible: boolean) { await executeSql(`INSERT INTO banners (title, image, isVisible) VALUES (?, ?, ?);`, [title, image, isVisible ? 1 : 0]); }
export async function getBannersLocal() { const res = await executeSql(`SELECT * FROM banners ORDER BY id DESC;`); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); return rows; }
export async function updateBannerVisibility(id: number, isVisible: boolean) { await executeSql(`UPDATE banners SET isVisible = ? WHERE id = ?;`, [isVisible ? 1 : 0, id]); }
export async function deleteBannerLocal(id: number) { await executeSql(`DELETE FROM banners WHERE id = ?;`, [id]); }
export async function getExercisesLocal() { const res = await executeSql('SELECT * FROM exercises ORDER BY createdAt DESC'); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); return rows; }

// ✅ Đã cập nhật: Thêm user_id vào định nghĩa kiểu dữ liệu (Type Definition)
export async function addExerciseLocal(ex: { 
    category: string; 
    title: string; 
    time?: string | number; 
    difficulty?: string; 
    exerciseCount?: number; 
    image?: string; 
    video_path?: string; 
    user_id?: number | string; // <--- QUAN TRỌNG: Thêm dòng này
}) { 
    const createdAt = Date.now(); 
    
    // Cập nhật câu SQL để lưu user_id
    const sql = 'INSERT INTO exercises (category, title, time, difficulty, exerciseCount, image, createdAt, video_path, user_id) VALUES (?,?,?,?,?,?,?,?,?);'; 
    
    const res = await executeSql(sql, [ 
        ex.category, 
        ex.title, 
        ex.time || 0, 
        ex.difficulty || '', 
        ex.exerciseCount || 0, 
        ex.image || '', 
        createdAt, 
        ex.video_path || '',
        ex.user_id || null // <--- Truyền giá trị vào đây
    ]); 
    return res.insertId; 
}

export async function updateExerciseLocal(id: number | string, data: any) { const fields = Object.keys(data); if (fields.length === 0) return; const sets = fields.map((f) => `${f} = ?`).join(', '); const params = fields.map((f) => data[f]); params.push(id); await executeSql(`UPDATE exercises SET ${sets} WHERE id = ?`, params); }
export async function deleteExerciseLocal(id: number | string) { await executeSql('DELETE FROM exercises WHERE id = ?', [id]); await deleteSubExercisesByParent(Number(id)); }

export const addSubExerciseLocal = async (data: any) => {
  const { name, type, count, video_path, instruction, focus_area, muscle_image, instruction_video, parent_id } = data;
  const createdAt = Date.now();
  const query = `
    INSERT INTO sub_exercises (parent_id, name, type, reps, time, video_path, instruction, focus_area, muscle_image, instruction_video, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const repsVal = type === 'rep' ? (count || 10) : 0;
  const timeVal = type === 'time' ? String(count || "00:20") : "00:00";
  await executeSql(query, [parent_id || 0, name, type, repsVal, timeVal, video_path, instruction, focus_area, muscle_image, instruction_video, createdAt]);
};

export async function cloneSubExercise(sourceSubId: number, targetParentId: number) { 
  const res = await executeSql("SELECT * FROM sub_exercises WHERE id = ?", [sourceSubId]); 
  if (res.rows.length === 0) return; 
  const src = res.rows.item(0); 
  const orderRes = await executeSql( "SELECT MAX(order_index) as max_order FROM sub_exercises WHERE parent_id = ?", [targetParentId] ); 
  const maxOrder = orderRes.rows.item(0).max_order || 0; 
  const newOrder = maxOrder + 1; 
  await executeSql( `INSERT INTO sub_exercises (parent_id, name, detail, video_path, type, reps, time, order_index, instruction, focus_area, muscle_image, instruction_video, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
  [ targetParentId, src.name, src.detail, src.video_path, src.type, src.reps, src.time, newOrder, src.instruction, src.focus_area, src.muscle_image, src.instruction_video, Date.now() ] ); 
}

export async function updateSubExerciseLocal( id: number, name: string, detail: string, video: string | null, type: "time" | "rep" ) { const cleanDetail = detail.replace(/[^0-9]/g, ""); const reps = type === "rep" ? (parseInt(cleanDetail) || 10) : 0; const time = type === "time" ? cleanDetail : "00:20"; await executeSql( `UPDATE sub_exercises SET name = ?, detail = ?, video_path = ?, type = ?, reps = ?, time = ? WHERE id = ?`, [name, detail, video, type, reps, time, id] ); }
export async function getSubExercisesLocal(parentId: number) { const res = await executeSql( `SELECT * FROM sub_exercises WHERE parent_id = ? ORDER BY order_index ASC`, [parentId] ); const list: any[] = []; for (let i = 0; i < res.rows.length; i++) { const item = res.rows.item(i); const reps = item.type === 'rep' ? (item.reps || parseInt(item.detail) || 10) : 0; const time = item.type === 'time' ? (item.time || item.detail || "00:20") : "00:00"; list.push({ ...item, video_path: item.video_path, reps: reps, time: time, isTimed: item.type === "time", }); } return list; }
export async function deleteSubExerciseLocal(id: number) { await executeSql("DELETE FROM sub_exercises WHERE id = ?", [id]); }
export async function deleteSubExercisesByName(name: string) { await executeSql("DELETE FROM sub_exercises WHERE name = ?", [name]); }
export async function updateSubExerciseOrder(id: number, newOrder: number) { await executeSql( "UPDATE sub_exercises SET order_index = ? WHERE id = ?", [newOrder, id] ); }
export async function deleteSubExercisesByParent(parentId: number) { await executeSql('DELETE FROM sub_exercises WHERE parent_id = ?', [parentId]); }
export async function getAllSubExercisesLocal() { const result = await executeSql("SELECT * FROM sub_exercises"); const rows = []; for (let i = 0; i < result.rows.length; i++) { rows.push(result.rows.item(i)); } return rows; }

// ======================
// ⭐ REVIEW MANAGEMENT
// ======================
export async function addReview(userId: number, courseId: number, courseName: string, rating: number, comment: string) { const createdAt = new Date().toISOString(); const sql = `INSERT INTO reviews (user_id, course_id, course_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)`; await executeSql(sql, [userId, courseId, courseName, rating, comment, createdAt]); }
export async function getReviewsByUser(userId: number) { const sql = `SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC`; const res = await executeSql(sql, [userId]); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); return rows; }
export async function getReviewsByCourse(courseId: number) { const sql = ` SELECT r.*, u.username, u.photoURL FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.course_id = ? ORDER BY r.created_at DESC `; const res = await executeSql(sql, [courseId]); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); return rows; }

export async function addExerciseToLibrary({ name, detail, image, reps, sets }: any) { const createdAt = Date.now(); const sql = `INSERT INTO sub_exercises_library (name, detail, image, reps, sets, createdAt) VALUES (?, ?, ?, ?, ?, ?);`; const res = await executeSql(sql, [name, detail || "", image || "", reps || 10, sets || 3, createdAt]); return res.insertId; }
export async function getExercisesFromLibrary() { const res = await executeSql("SELECT * FROM sub_exercises_library ORDER BY createdAt DESC"); const rows: any[] = []; for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i)); return rows; }
export async function getExerciseById(id: number) { const res = await executeSql("SELECT * FROM exercises WHERE id = ? LIMIT 1", [id]); if (res.rows.length > 0) return res.rows.item(0); return null; }
export async function resetDuplicates() { try { await executeSql("DELETE FROM facilities"); await executeSql("DELETE FROM personal_trainers"); console.log("🧹 Duplicates cleared!"); } catch (err) { console.error("Error resetDuplicates:", err); } }
export async function clearOldFacilities() { try { await executeSql("DELETE FROM facilities WHERE name LIKE '%HUTECH Gym%';"); } catch (e) { console.log("⚠️ Skipped clearOldFacilities"); } }
export async function seedAdminOnce() { try { const existing = await getUserByEmailLocal("admin@appgym.local"); if (!existing) { await createUserLocal({ uid: "seed-admin", email: "admin@appgym.local", username: "Administrator", password: "admin123", role: "admin", gender: "Nam", height: 0, weight: 0, photoURL: "", }); console.log("✅ Admin seeded"); } } catch (err) { console.warn("seedAdminOnce error:", err); } }
export async function forceResetAdmin() { try { await executeSql("DELETE FROM users WHERE email = ?", ["admin@appgym.local"]); await seedAdminOnce(); console.log("✅ Admin reset forced"); } catch (err) { console.error("forceResetAdmin error:", err); } }

export const calculateStreak = async (userId: number) => {
  try {
    const sql = "SELECT DISTINCT substr(date, 1, 10) as workout_date FROM workout_sessions WHERE user_id = ? ORDER BY workout_date DESC";
    const res = await executeSql(sql, [userId]);
    let streak = 0;
    const now = new Date();
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = vnNow.toISOString().split('T')[0];
    const vnYesterday = new Date(vnNow);
    vnYesterday.setDate(vnYesterday.getDate() - 1);
    const yesterdayStr = vnYesterday.toISOString().split('T')[0];

    if (res.rows.length === 0) return 0;
    const lastWorkoutDate = res.rows.item(0).workout_date;

    if (lastWorkoutDate !== todayStr && lastWorkoutDate !== yesterdayStr) return 0;

    let currentDateStr = lastWorkoutDate;
    for (let i = 0; i < res.rows.length; i++) {
      const dbDateStr = res.rows.item(i).workout_date;
      if (dbDateStr === currentDateStr) {
        streak++;
        const d = new Date(currentDateStr);
        d.setDate(d.getDate() - 1);
        currentDateStr = d.toISOString().split('T')[0];
      } else { break; }
    }
    return streak;
  } catch (e) { console.error("❌ Error calculating streak", e); return 0; }
};

// ======================
// ✅ TỐI ƯU: Sử dụng Promise.all để tăng tốc độ
// ======================
export async function getRegisteredCoursesForRating(userId: number): Promise<RegisteredCourse[]> {
  const sql = `
    SELECT 
        p.course_id, p.course_title, p.user_name, p.amount, p.created_at, 
        c.ptName, c.image, c.sessions AS total_sessions,
        c.startDate AS start_date,  
        c.endDate AS end_date,
        c.facility,
        c.description,
        c.price 
    FROM payments p
    LEFT JOIN courses c ON p.course_id = c.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC;
  `;

  try {
    const res = await executeSql(sql, [userId]);
    const promises = [];

    for (let i = 0; i < res.rows.length; i++) {
      const item = res.rows.item(i);
      
      const p = (async () => {
         // Kiểm tra xem đã đánh giá chưa
         const reviewCheck = await executeSql(
           'SELECT id FROM reviews WHERE user_id = ? AND course_id = ? LIMIT 1', 
           [userId, item.course_id]
         );
         
         // Kiểm tra số buổi đã học
         const attendanceCheck = await executeSql(
           `SELECT COUNT(*) as attended_count 
            FROM attendance a
            JOIN classes cl ON a.class_id = cl.id
            WHERE a.user_id = ? 
            AND cl.course_id = ? 
            AND (a.status = 'present' OR a.status = 'late')`,
           [userId, item.course_id]
         );

         const attendedSessions = attendanceCheck.rows.length > 0 ? attendanceCheck.rows.item(0).attended_count : 0;
         const totalSessions = item.total_sessions || 0;
         const isCompleted = attendedSessions >= totalSessions && totalSessions > 0;

         return {
             ...item,
             is_rated: reviewCheck.rows.length > 0,
             pt_name: item.ptName || '',
             image: item.image || '',
             attended_sessions: attendedSessions, 
             total_sessions: totalSessions,
             can_rate: isCompleted,
             start_date: item.start_date,
             end_date: item.end_date,
             facility: item.facility,
             description: item.description,
             price: item.price
         };
      })();
      promises.push(p);
    }
    
    return await Promise.all(promises);
  } catch (error) {
    console.error("Lỗi getRegisteredCoursesForRating:", error);
    return [];
  }
}

export async function getTrainersToRate(userId: number) {
  const sql = `
    SELECT DISTINCT c.ptName as ptName, pt.photo
    FROM classes c
    LEFT JOIN personal_trainers pt ON c.ptName = pt.name
    WHERE c.user_id = ?
    AND c.ptName IS NOT NULL
    AND c.ptName != ''
    AND c.ptName NOT IN (SELECT pt_name FROM pt_reviews WHERE user_id = ?)
  `;
  const res = await executeSql(sql, [userId, userId]);
  const rows = [];
  for (let i = 0; i < res.rows.length; i++) {
    rows.push(res.rows.item(i));
  }
  return rows;
}

export async function addPtReview(userId: number, ptName: string, rating: number, comment: string) {
  const createdAt = new Date().toISOString();
  await executeSql(
    `INSERT INTO pt_reviews (user_id, pt_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)`,
    [userId, ptName, rating, comment, createdAt]
  );
}

export async function calculateAverageRatings(courseId: number, ptName: string | null) {
  try {
    const courseRes = await executeSql(
      `SELECT AVG(rating) as avgRating, COUNT(*) as count FROM reviews WHERE course_id = ?`,
      [courseId]
    );
    const courseAvg = courseRes.rows.length > 0 ? courseRes.rows.item(0).avgRating : 0;
    const courseCount = courseRes.rows.length > 0 ? courseRes.rows.item(0).count : 0;

    let ptAvg = 0;
    let ptCount = 0;
    if (ptName) {
      const ptRes = await executeSql(
        `SELECT AVG(rating) as avgRating, COUNT(*) as count FROM pt_reviews WHERE pt_name = ?`,
        [ptName]
      );
      ptAvg = ptRes.rows.length > 0 ? ptRes.rows.item(0).avgRating : 0;
      ptCount = ptRes.rows.length > 0 ? ptRes.rows.item(0).count : 0;
    }

    return {
      course: { avg: parseFloat(courseAvg?.toFixed(1) || "0"), count: courseCount },
      pt: { avg: parseFloat(ptAvg?.toFixed(1) || "0"), count: ptCount }
    };
  } catch (error) {
    console.error("Lỗi tính trung bình đánh giá:", error);
    return {
      course: { avg: 0, count: 0 },
      pt: { avg: 0, count: 0 }
    };
  }
}

// ======================
// 🎟️ COUPON MANAGEMENT (MỚI)
// ======================
export const getCoupons = async () => {
  try {
    const res = await executeSql("SELECT * FROM coupons ORDER BY id DESC");
    const items: any[] = [];
    for (let i = 0; i < res.rows.length; i++) items.push(res.rows.item(i));
    return items;
  } catch (error) {
    console.error("Error getting coupons:", error);
    return [];
  }
};

export const addCoupon = async (
  code: string, 
  percent: number, 
  description: string, 
  expiryDate: string, 
  limit: number // 🆕 Thêm tham số limit
) => {
  const createdAt = new Date().toISOString();
  const upperCode = code.toUpperCase();
  
  // expiryDate format: YYYY-MM-DD
  // 🆕 Thêm cột usage_limit vào câu lệnh INSERT
  return await executeSql(
    `INSERT INTO coupons (code, percent, description, expiry_date, usage_limit, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [upperCode, percent, description, expiryDate, limit, createdAt]
  );
};

export const toggleCouponStatus = async (id: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    return await executeSql(`UPDATE coupons SET is_active = ? WHERE id = ?`, [newStatus, id]);
};

export const deleteCoupon = async (id: number) => {
  return await executeSql(`DELETE FROM coupons WHERE id = ?`, [id]);
};

// 🆕 Hàm kiểm tra Coupon (Validate)
export const checkCouponValidity = async (code: string) => {
    const upperCode = code.toUpperCase().trim();
    const res = await executeSql("SELECT * FROM coupons WHERE code = ? LIMIT 1", [upperCode]);
    
    if (res.rows.length === 0) return { valid: false, message: "Mã giảm giá không tồn tại" };
    
    const coupon = res.rows.item(0);
    
    // 1. Check active
    if (coupon.is_active !== 1) return { valid: false, message: "Mã giảm giá đã bị khóa" };
    
    // 2. Check Expiry
    if (coupon.expiry_date) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const exp = new Date(coupon.expiry_date);
        if (exp < today) return { valid: false, message: "Mã giảm giá đã hết hạn" };
    }

    // 3. Check Limit
    if (coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit) {
        return { valid: false, message: "Mã giảm giá đã hết lượt sử dụng" };
    }

    return { valid: true, coupon };
};

// 🆕 Hàm dùng Coupon (Trừ lượt)
export const useCoupon = async (code: string) => {
    const upperCode = code.toUpperCase().trim();
    return await executeSql("UPDATE coupons SET usage_count = usage_count + 1 WHERE code = ?", [upperCode]);
};


// ======================
// 📤 EXPORT DEFAULT
// ======================
export default {
  openDB, closeDB, initDB, executeSql,
  deleteSubExercisesByName, 
  getAllCategories, addCategory,
  getAllGymBranches, getGymBranchesLocal, insertGymBranch, updateGymBranch, deleteGymBranch, createGymBranchTable,
  addCourseLocal, getCoursesLocal, getVisibleCoursesLocal, deleteCourseLocal, updateCourseVisibility,
  addPayment, getRevenueReport,
  getClassAttendance, updateAttendanceStatus,
  createUserLocal, getUserByEmailLocal, validateUserLocal, getAllUsersLocal, updateUserRoleLocal, deleteUserLocal,
  getAllTrainers, addTrainer, updateTrainer, deleteTrainer,
  getExercisesLocal, addExerciseLocal, deleteExerciseLocal, updateExerciseLocal, getExerciseById,
  getSubExercisesLocal, addSubExerciseLocal, updateSubExerciseLocal, updateSubExerciseOrder, deleteSubExerciseLocal, getAllSubExercisesLocal, deleteSubExercisesByParent, cloneSubExercise, 
  addReview, getReviewsByUser, getReviewsByCourse,
  addExerciseToLibrary, getExercisesFromLibrary,
  seedAdminOnce, forceResetAdmin, resetDuplicates, clearOldFacilities,
  addWeightRecordLocal, getWeightHistoryLocal,
  addWorkoutSession, 
  getWorkoutSessionsLocal, getWorkoutSessionsByDateRange, getWorkoutSessionsForWeek,
  createBannerTable, addBannerLocal, getBannersLocal, updateBannerVisibility, deleteBannerLocal,
  addClassLocal, getClassesLocal, getTrainerSchedule,
  checkUserRegistration, cancelRegistration, 
  addNotification, getUnreadNotifications, markNotificationsAsRead,
  saveWorkoutLog, getLastWorkoutLog, getAllLastLogs, 
  saveWorkoutProgress, getWorkoutProgress, deleteWorkoutProgress,
  getCurrentUserId, calculateStreak,
  
  // Feature Requests
  addFeatureRequest, getAllFeatureRequests, countPendingFeatureRequests, markAllFeatureRequestsAsRead,
  
  // Export cho tính năng Đánh giá Khóa học/PT
  getRegisteredCoursesForRating,
  getTrainersToRate,
  addPtReview,
  calculateAverageRatings, getReviewsByPT, autoCloseExpiredCourses,

  // Export cho tính năng Mã Giảm Giá
  getCoupons, addCoupon, deleteCoupon, toggleCouponStatus, checkCouponValidity, useCoupon,

  getNotificationsByUserId,      // ✅ Mới
  countUnreadNotifications,      // ✅ Mới
  markNotificationAsRead,        // ✅ Mới
  markAllNotificationsAsRead,    // ✅ Mới
  deleteNotification,            // ✅ Mới
  deleteAllNotifications,        // ✅ Mới
  
  // ✅ Mới: Hàm sửa lỗi trùng lặp
  fixDuplicateClasses,
};