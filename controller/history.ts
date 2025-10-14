import express from "express";
import { conn } from "../dbconnect";

export const router = express.Router();

// --- guard ---
function isAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!(req.session as any).user)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

/**
 * GET /users/:id/history
 * คืนรายการเกมที่ user ซื้อ
 */
router.get("/:id/history", isAuth, async (req, res) => {
  const sessionUser = (req.session as any).user;
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0)
    return res.status(400).json({ message: "invalid user id" });

  // ถ้าไม่ใช่ admin และขอดู user อื่น → ปฏิเสธ
  if (sessionUser.role !== "ADMIN" && sessionUser.id !== userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // query ปกติ
  try {
    const sql = `
      SELECT p.id AS purchase_id, p.purchase_date,
             pi.game_id, g.name AS game_name,
             g.image_path AS cover_image, pi.price
      FROM purchases p
      INNER JOIN purchase_items pi ON pi.purchase_id = p.id
      INNER JOIN games g ON g.id = pi.game_id
      WHERE p.user_id = ?
      ORDER BY p.purchase_date DESC
    `;
    const [rows] = await conn.query(sql, [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงประวัติ" });
  }
});
