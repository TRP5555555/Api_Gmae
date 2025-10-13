import express, { Request, Response } from "express";
import { conn } from "../dbconnect"; // ใช้ไฟล์ dbconnect.ts ของคุณ

const router = express.Router();

/** ✅ ดูตะกร้าของผู้ใช้ */
router.get("/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId;

  try {
    const [rows]: any = await conn.query(
      `SELECT 
         ci.id AS cart_id,
         g.id AS game_id,
         g.name AS title,
         g.price,
         COALESCE(g.image_path, 'default_game.png') AS image
       FROM cart_items ci
       JOIN games g ON g.id = ci.game_id
       WHERE ci.user_id = ?
       ORDER BY ci.added_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error", error });
  }
});

/** ✅ เพิ่มเกมลงตะกร้า */
router.post("/add", async (req: Request, res: Response) => {
  const { user_id, game_id } = req.body;

  if (!user_id || !game_id)
    return res.status(400).json({ message: "Missing user_id or game_id" });

  try {
    // ตรวจสอบว่าผู้ใช้มีเกมนี้อยู่แล้วหรือยัง
    const [owned]: any = await conn.query(
      "SELECT * FROM purchase_items pi JOIN purchases p ON pi.purchase_id = p.id WHERE p.user_id = ? AND pi.game_id = ?",
      [user_id, game_id]
    );
    if (owned.length > 0)
      return res.status(400).json({ message: "คุณมีเกมนี้อยู่แล้ว" });

    // ตรวจสอบว่ามีเกมในตะกร้าแล้วหรือยัง
    const [check]: any = await conn.query(
      "SELECT * FROM cart_items WHERE user_id = ? AND game_id = ?",
      [user_id, game_id]
    );
    if (check.length > 0)
      return res.status(400).json({ message: "เกมนี้อยู่ในตะกร้าแล้ว" });

    // เพิ่มลงตะกร้า
    await conn.query(
      "INSERT INTO cart_items (user_id, game_id) VALUES (?, ?)",
      [user_id, game_id]
    );

    res.json({ message: "เพิ่มเกมลงตะกร้าสำเร็จ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error", error: err });
  }
});

/** ✅ ลบเกมออกจากตะกร้า */
router.delete("/remove/:cart_id", async (req: Request, res: Response) => {
  const { cart_id } = req.params;
  try {
    await conn.query("DELETE FROM cart_items WHERE id = ?", [cart_id]);
    res.json({ message: "ลบเกมออกจากตะกร้าสำเร็จ" });
  } catch (error) {
    res.status(500).json({ message: "Database error", error });
  }
});

/** ✅ สั่งซื้อเกมจากตะกร้า */
router.post("/checkout", async (req: Request, res: Response) => {
  const { user_id, selected_cart_ids, discount_code } = req.body;

  if (!user_id || !selected_cart_ids || selected_cart_ids.length === 0)
    return res.status(400).json({ message: "Invalid request" });

  const connection = await conn.getConnection();
  try {
    await connection.beginTransaction();

    // ดึงยอดเงินผู้ใช้
    const [userRows]: any = await connection.query(
      "SELECT wallet FROM users WHERE id = ? FOR UPDATE",
      [user_id]
    );
    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }
    let wallet = parseFloat(userRows[0].wallet);

    // ดึงเกมจากตะกร้า
    const [cartGames]: any = await connection.query(
      `SELECT ci.id AS cart_id, g.id AS game_id, g.name, g.price
       FROM cart_items ci
       JOIN games g ON g.id = ci.game_id
       WHERE ci.id IN (?) AND ci.user_id = ?`,
      [selected_cart_ids, user_id]
    );

    if (cartGames.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "No games found in cart" });
    }

    // ตรวจสอบเกมที่มีอยู่แล้ว
    const gameIds = cartGames.map((g: any) => g.game_id);
    const [owned]: any = await connection.query(
      "SELECT pi.game_id FROM purchase_items pi JOIN purchases p ON pi.purchase_id = p.id WHERE p.user_id = ? AND pi.game_id IN (?)",
      [user_id, gameIds]
    );
    if (owned.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Some games are already owned", owned_game_ids: owned.map((o: any) => o.game_id) });
    }

    // คำนวณราคาทั้งหมด
    let totalPrice = cartGames.reduce((sum: number, g: any) => sum + parseFloat(g.price), 0);
    let discount = 0;

    // ตรวจสอบโค้ดส่วนลด
    if (discount_code) {
      const [codeRows]: any = await connection.query(
        "SELECT * FROM discount_codes WHERE code = ? AND used_count < usage_limit",
        [discount_code]
      );
      if (codeRows.length > 0) {
        discount = parseFloat(codeRows[0].discount_amount);
        await connection.query(
          "INSERT INTO user_discount_usage (user_id, discount_code_id) VALUES (?, ?)",
          [user_id, codeRows[0].id]
        );
        await connection.query(
          "UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?",
          [codeRows[0].id]
        );
      }
    }

    const finalPrice = Math.min(totalPrice - discount, totalPrice);

    if (wallet < finalPrice) {
      await connection.rollback();
      return res.status(400).json({ message: "Insufficient wallet balance", balance: wallet, total_price: finalPrice });
    }

    // สร้าง purchase
    const [purchaseResult]: any = await connection.query(
      "INSERT INTO purchases (user_id, total_amount) VALUES (?, ?)",
      [user_id, finalPrice]
    );
    const purchaseId = purchaseResult.insertId;

    // เพิ่ม purchase_items และ transactions
    for (const g of cartGames) {
      await connection.query(
        "INSERT INTO purchase_items (purchase_id, game_id, price) VALUES (?, ?, ?)",
        [purchaseId, g.game_id, g.price]
      );

      await connection.query(
        "INSERT INTO transactions (user_id, type, amount, game_id) VALUES (?, 'purchase', ?, ?)",
        [user_id, g.price, g.game_id]
      );
    }

    // ลบเกมออกจากตะกร้า
    await connection.query(
      "DELETE FROM cart_items WHERE id IN (?)",
      [selected_cart_ids]
    );

    // หักเงิน
    wallet -= finalPrice;
    await connection.query("UPDATE users SET wallet = ? WHERE id = ?", [wallet, user_id]);

    await connection.commit();

    res.json({
      message: "Purchase successful",
      purchase_id: purchaseId,
      total_price: totalPrice,
      discount,
      final_price: finalPrice,
      balance_after: wallet,
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Database error", error: err });
  } finally {
    connection.release();
  }
});

export default router;
