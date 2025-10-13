// src/routes/wallet.ts
import { Router, Request, Response } from "express";
import { conn } from "../dbconnect";

const router = Router();

/**
 * GET /api/wallet/:userId
 * ดึงยอดเงินของผู้ใช้
 */
router.get("/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId;

  try {
    const [rows]: any = await conn.query(
      "SELECT id, username, wallet FROM users WHERE id = ?",
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user_id: rows[0].id,
      username: rows[0].username,
      balance: rows[0].wallet,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error", error });
  }
});

/**
 * POST /api/wallet/topup
 * เติมเงินเข้ากระเป๋า
 */
router.post("/topup", async (req: Request, res: Response) => {
  const { user_id, amount } = req.body;

  if (!user_id || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid user_id or amount" });
  }

  const connection = await conn.getConnection();
  try {
    await connection.beginTransaction();

    // ดึงยอดเงินปัจจุบันและ lock row
    const [rows]: any = await connection.query(
      "SELECT wallet FROM users WHERE id = ? FOR UPDATE",
      [user_id]
    );

    if (!rows || rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const currentBalance = parseFloat(rows[0].wallet) || 0;
    const newBalance = currentBalance + parseFloat(amount);

    // อัปเดต wallet
    await connection.query(
      "UPDATE users SET wallet = ? WHERE id = ?",
      [newBalance, user_id]
    );

    // เพิ่ม transaction
    await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status)
       VALUES (?, 'deposit', ?, 'success')`,
      [user_id, amount]
    );

    await connection.commit();

    res.json({
      message: "Top-up successful",
      user_id,
      new_balance: newBalance.toFixed(2),
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Database error", error });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/wallet/admin/transactions
 * ดูธุรกรรมทั้งหมด (Admin)
 */
router.get("/admin/transactions", async (req: Request, res: Response) => {
  const { user_id } = req.query;

  try {
    let sql = `
      SELECT 
        t.id AS tx_id,
        t.user_id,
        u.username,
        t.type AS tx_type,
        t.amount,
        t.game_id AS reference_id,
        t.status,
        DATE_FORMAT(t.transaction_date, '%d/%m/%Y %H:%i') AS created_at
      FROM transactions t
      JOIN users u ON t.user_id = u.id
    `;
    const params: any[] = [];

    if (user_id) {
      sql += " WHERE t.user_id = ?";
      params.push(user_id);
    }

    sql += " ORDER BY t.transaction_date DESC";

    const [rows]: any = await conn.query(sql, params);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "No transactions found" });
    }

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error", error });
  }
});

/**
 * GET /api/wallet/history/topup/:userId
 * ดึงประวัติการเติมเงินของผู้ใช้
 */
router.get("/history/topup/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId;

  try {
    const [rows]: any = await conn.query(
      `
      SELECT 
        t.id AS id,
        t.amount AS amount,
        u.username AS username,
        DATE_FORMAT(t.transaction_date, '%d/%m/%Y %H:%i') AS date
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      WHERE t.user_id = ? AND t.type = 'deposit'
      ORDER BY t.transaction_date DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error", error });
  }
});

/**
 * GET /api/wallet/history/purchase/:userId
 * ดึงประวัติการซื้อเกมของผู้ใช้
 */
router.get("/history/purchase/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId;

  try {
    
    const [rows]: any = await conn.query(
      `
      SELECT 
        pi.id AS id,
        g.name AS name,
        c.name AS type,
        pi.price AS price,
        u.username AS username,
        DATE_FORMAT(p.purchase_date, '%d/%m/%Y %H:%i') AS date
      FROM purchases p
      JOIN purchase_items pi ON pi.purchase_id = p.id
      JOIN games g ON g.id = pi.game_id
      JOIN game_categories c ON c.id = g.category_id
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      ORDER BY p.purchase_date DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error", error });
  }
});

export default router;
