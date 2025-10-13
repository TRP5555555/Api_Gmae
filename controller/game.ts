// Project/src/app/controller/game.ts
import express from "express";
import { conn } from "../dbconnect"; // ตามโครงโปรเจคของคุณ
const router = express.Router();

/**
 * GET /games
 * คืนรายการเกม (list)
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await conn.query("SELECT * FROM games");
    res.json(rows);
  } catch (err) {
    console.error("Query error:", err); //
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลเกม" });
  }
});
/**
 * GET /games/:id
 * คืนรายละเอียดเกมตัวเดียว (แม็ป field ให้ตรงกับ frontend model)
 */
// GET /games/:id
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const sql = `
  SELECT
    g.id AS game_id,
    g.name AS title,
    g.price,
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
    return res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching game by id:", err);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" });
  }
});

export default router;
