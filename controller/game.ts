// Project/src/app/controller/game.ts
import express from "express";
import { conn } from "../dbconnect"; // ตามโครงโปรเจคของคุณ
const router = express.Router();

import fs from "fs";
import path from "path";
import multer from "multer";


// เตรียมโฟลเดอร์อัปโหลด + เสิร์ฟสาธารณะ (ตั้งในไฟล์ app.ts ก็ได้)
const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ถ้าเสิร์ฟ static ที่ไฟล์ app.ts: app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${path.extname(file.originalname) || ".png"}`)
});
const upload = multer({ storage });

/**
 * GET /games
 * คืนรายการเกม (list)
 */
// Project/src/app/controller/game.ts
router.get("/", async (_req, res) => {
  try {
    const sql = `
      SELECT
        g.id AS game_id,
        g.name AS title,
        g.price,
        g.image_path AS cover_image
      FROM games g
      ORDER BY g.created_at DESC, g.id DESC
    `;
    const [rows] = await conn.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลเกม" });
  }
});
router.get("/categories", async (_req, res) => {
  try {
    const [rows] = await conn.query("SELECT id, name FROM game_categories ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงประเภทเกม" });
  }
});

/**
 * GET /games/:id
 * คืนรายละเอียดเกมตัวเดียว (แม็ป field ให้ตรงกับ frontend model)
 */
// GET /games/:id
router.get("/:id", async (req, res) => {
  // 1) ตรวจ id ให้เป็นตัวเลขบวก
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "invalid game id" });
  }

  try {
    const sql = `
      SELECT
        g.id AS game_id,
        g.name AS title,
        CAST(g.price AS DECIMAL(18,2)) AS price,
        g.description,
        DATE_FORMAT(g.release_date, '%Y-%m-%d') AS release_date,
        g.category_id,
        c.name AS category_name,
        g.image_path AS cover_image,
        IFNULL((SELECT SUM(pi.price) FROM purchase_items pi WHERE pi.game_id = g.id),0) AS total_sales,
        (SELECT MAX(gr.rank_date) FROM game_ranking gr WHERE gr.game_id = g.id) AS ranking_date,
        g.created_at,
        g.updated_at
      FROM games g
      LEFT JOIN game_categories c ON g.category_id = c.id
      WHERE g.id = ?
      LIMIT 1
    `;

    const [rows]: any = await conn.query(sql, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Game not found" });
    }

    // 2) บังคับชนิดฝั่ง API ให้ frontend ใช้ง่าย
    const r = rows[0];
    const data = {
      game_id: Number(r.game_id),
      title: String(r.title ?? ""),
      price: Number(r.price ?? 0),
      description: r.description ?? null,
      release_date: r.release_date ?? null,
      category_id: r.category_id !== null ? Number(r.category_id) : null,
      category_name: r.category_name ?? null,
      // 3) รูป: เก็บ path เดิมไว้ให้ frontend ต่อโดเมนเอง
      cover_image: r.cover_image ?? null,
      total_sales: Number(r.total_sales ?? 0),
      ranking_date: r.ranking_date ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };

    return res.json(data);
  } catch (err) {
    console.error("Error fetching game by id:", err);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" });
  }
});


//new game
router.post("/", upload.single("image"), async (req, res) => {
  try {
    let { name, description, category_id, price, type } = req.body;
    if (!name) return res.status(400).json({ message: "กรุณาระบุชื่อเกม" });

    // ถ้า category_id ไม่ใช่ตัวเลข ให้ลองหา id จากชื่อหมวด (type)
    let resolvedCatId: number | null = Number(category_id);
    if (!resolvedCatId || Number.isNaN(resolvedCatId)) {
      if (type) {
        const [rows]: any = await conn.query(
          "SELECT id FROM game_categories WHERE name = ? LIMIT 1", [type]
        );
        resolvedCatId = rows?.[0]?.id ?? null;
      }
    }
    if (!resolvedCatId) return res.status(400).json({ message: "category_id ไม่ถูกต้อง" });

    let image_path = req.body.image_path || "default_game.png";
    if (req.file) image_path = `/uploads/${req.file.filename}`;

    const sql = `INSERT INTO games (name, description, category_id, price, image_path)
                 VALUES (?, ?, ?, ?, ?)`;
    const params = [name, description || "", resolvedCatId, Number(price) || 0, image_path];

    console.log("BODY:", req.body);
    console.log("FILE:", req.file);
    console.log("SQL params:", params);

    const [result]: any = await conn.query(sql, params);
    return res.status(201).json({ message: "เพิ่มเกมสำเร็จ", game_id: result.insertId, image_path });
  } catch (err: any) {
    console.error("POST /games error:", err);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดขณะเพิ่มเกม", detail: err?.sqlMessage || err?.message });
  }
});


// DELETE /games/:id

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // ตรวจว่ามีเกมนี้จริงไหม
    const [rows]: any = await conn.query("SELECT image_path FROM games WHERE id = ?", [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบเกมที่ต้องการลบ" });
    }

    const imagePath = rows[0].image_path;
    const sql = "DELETE FROM games WHERE id = ?";
    await conn.query(sql, [id]);

    // ถ้ามีไฟล์ภาพและไม่ใช่ค่า default ให้ลบออกจากโฟลเดอร์
    if (imagePath && imagePath !== "default_game.png" && imagePath.startsWith("/uploads/")) {
      const fullPath = path.resolve(process.cwd(), "." + imagePath);
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.warn("ลบรูปไม่สำเร็จ:", err);
      }
    }

    res.json({ message: "ลบเกมสำเร็จ", game_id: id });
  } catch (err) {
    console.error("Error deleting game:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดขณะลบเกม" });
  }
});



export default router;

