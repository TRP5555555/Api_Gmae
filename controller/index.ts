// controller/index.ts
import express from "express";
import { conn } from "../dbconnect";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

export const router = express.Router();

// --- session guard ---
function isAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!(req.session as any).user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// --- uploads setup ---
const dir = path.resolve("uploads");
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, _file, cb) =>
    Date.now() + "-" + Math.random().toString(16).slice(2) + path.extname(_file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) =>
    /image\/(png|jpeg|jpg|webp|gif)/.test(file.mimetype) ? cb(null, true) : cb(new Error("Only image files"))
});

// --- REGISTER ---
router.post(
  "/register",
  upload.fields([{ name: "profile_image", maxCount: 1 }]),
  async (req, res) => {
    try {
      console.log("=== REGISTER REQUEST ===");
      console.log("BODY:", req.body);
      console.log("FILES:", req.files);

      const { email, username, password } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // ตรวจสอบซ้ำ
      const [dup] = await conn.query(
        "SELECT 1 FROM Users WHERE username=? OR email=?",
        [username, email]
      );
      if ((dup as any[]).length > 0) {
        return res.status(409).json({ error: "Email or username already exists" });
      }

      // บันทึกรูป profile image (ถ้ามี)
      let profile_image: string | null = null;
      const fileArray = (req.files as any)?.profile_image;
      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0];
        const ext = path.extname(file.originalname) || ".png";
        const newName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
        const newPath = path.join(dir, newName);
        fs.renameSync(file.path, newPath);
        profile_image = `/uploads/${newName}`;
      }

      // บันทึกลง DB
      const [result] = await conn.query(
        "INSERT INTO Users (email, username, password_hash, profile_image) VALUES (?, ?, ?, ?)",
        [email, username, password, profile_image]
      );

      console.log("REGISTER RESULT:", result);
      res.json({
        success: true,
        userId: (result as any).insertId,
        profile_image,
      });
    } catch (e: any) {
      console.error("REGISTER ERROR:", e);
      res.status(500).json({ error: e.message || "Register failed" });
    }
  }
);
