import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

export const router = express.Router();

const dir = path.resolve("uploads");
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    cb(null, Date.now() + "-" + Math.random().toString(16).slice(2) + ".png");
  }
});

const upload = multer({ storage });

router.post("/avatar", upload.single("profile_image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});
