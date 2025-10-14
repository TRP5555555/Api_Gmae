// controller/index.ts
import express from "express";
import { conn } from "../dbconnect";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

export const router = express.Router();

// --- session guard ---
function isAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!(req.session as any).user)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

// --- uploads setup ---
const dir = path.resolve("uploads");
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, _file, cb) =>
    cb(null, Date.now() + "-" + Math.random().toString(16).slice(2)), // ชื่อชั่วคราว ไม่ใส่ .ext
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) =>
    /image\/(png|jpeg|jpg|webp|gif)/.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only image files")),
});

// POST /users/avatar  field: profile_image  -> บันทึกเป็น .png เสมอ
router.post("/avatar", upload.single("profile_image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no file" });

    const outName = `${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
    const outPath = path.join(dir, outName);

    await sharp(req.file.path).png().toFile(outPath);
    fs.unlink(req.file.path, () => {});

    const url = `/uploads/${outName}`;
    return res.json({ success: true, url });
  } catch (e: any) {
    return res.status(500).json({ error: e.message ?? "convert failed" });
  }
});

router.get("/all", async (_req, res) => {
  try {
    const [rows] = await conn.query("SELECT id, username, email FROM users ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงรายชื่อ user" });
  }
});

// GET /users/:id/profile_image  -> คืนเฉพาะรูป
router.get("/:id/profile_image", async (req, res) => {
  const [rows] = await conn.query(
    "SELECT profile_image FROM users WHERE id=?",
    [req.params.id]
  );
  const r = (rows as any[])[0];
  if (!r) return res.status(404).json({ error: "Not found" });
  res.json({ profile_image: r.profile_image }); 
});

// ถ้าจะดูของ session ปัจจุบัน
router.get("/me/profile_image", (req, res) => {
  const u = (req.session as any).user;
  if (!u) return res.status(401).json({ error: "Not logged in" });
  res.json({ profile_image: u.profile_image });
});

// --- auth/session ---
router.get("/me", (req, res) => {
  if (!(req.session as any).user)
    return res.status(401).json({ error: "Not logged in" });
  res.json((req.session as any).user);
});

router.put("/me", isAuth, async (req, res) => {
  const uid = (req.session as any).user.id;
  const { username, email, password, profile_image } = req.body;

  const f: string[] = [];
  const v: any[] = [];
  if (username) {
    f.push("username=?");
    v.push(username);
  }
  if (email) {
    f.push("email=?");
    v.push(email);
  }
  if (password) {
    f.push("password=?");
    v.push(password);
  }
  if (profile_image) {
    f.push("profile_image=?");
    v.push(profile_image);
  }
  if (!f.length) return res.json({ success: true });

  v.push(uid);
  await conn.query(
    `UPDATE users SET ${f.join(",")}, updated_at=NOW() WHERE id=?`,
    v
  );

  const [rows] = await conn.query("SELECT * FROM users WHERE id = ?", [uid]);
  (req.session as any).user = (rows as any[])[0];
  res.json({ success: true, user: (rows as any[])[0] });
});

// --- misc ---
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

router.get("/", async (_req, res) => {
  const [rows] = await conn.query("SELECT * FROM users");
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [rows] = await conn.query("SELECT * FROM users WHERE id = ?", [
    req.params.id,
  ]);
  const users = rows as any[];
  if (!users.length) return res.status(404).json({ error: "User not found" });
  res.json(users[0]);
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await conn.query(
    "SELECT * FROM users WHERE username = ? AND password_hash = ?",
    [username, password]
  );
  const users = rows as any[];
  if (!users.length)
    return res.status(401).json({ error: "Invalid username or password" });
  (req.session as any).user = users[0];
  res.json({ success: true, user: users[0] });
});

router.post("/register", upload.single("profile_image"), async (req, res) => {
  try {
    console.log("=== REGISTER FIXED REQUEST ===");
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ตรวจสอบซ้ำ (ใช้ table users ตัวเล็ก)
    const [dup] = await conn.query(
      "SELECT 1 FROM users WHERE username=? OR email=?",
      [username, email]
    );
    if ((dup as any[]).length > 0) {
      return res
        .status(409)
        .json({ error: "Email or username already exists" });
    }

    // บันทึกรูป profile image (ถ้ามี)
    let profile_image: string | null = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname) || ".png";
      const newName = `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}${ext}`;
      const newPath = path.join(dir, newName);

      fs.renameSync(req.file.path, newPath);
      profile_image = `/uploads/${newName}`;
    }

    // บันทึกลง DB (ใช้ password_hash ตามตารางจริง)
    const [result] = await conn.query(
      "INSERT INTO users (username, email, password_hash, profile_image) VALUES (?, ?, ?, ?)",
      [username, email, password, profile_image]
    );

    console.log("REGISTER FIXED RESULT:", result);

    res.json({
      success: true,
      userId: (result as any).insertId,
      profile_image,
    });
  } catch (e: any) {
    console.error("REGISTER FIXED ERROR:", e);
    res.status(500).json({ error: e.message || "Register failed" });
  }
});

