"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
// controller/index.ts
const express_1 = __importDefault(require("express"));
const dbconnect_1 = require("../dbconnect");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
exports.router = express_1.default.Router();
// --- session guard ---
function isAuth(req, res, next) {
    if (!req.session.user)
        return res.status(401).json({ error: "Unauthorized" });
    next();
}
// --- uploads setup ---
const dir = path_1.default.resolve("uploads");
fs_1.default.mkdirSync(dir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, _file, cb) => cb(null, Date.now() + "-" + Math.random().toString(16).slice(2)) // ชื่อชั่วคราว ไม่ใส่ .ext
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => /image\/(png|jpeg|jpg|webp|gif)/.test(file.mimetype) ? cb(null, true) : cb(new Error("Only image files"))
});
// POST /users/avatar  field: profile_image  -> บันทึกเป็น .png เสมอ
exports.router.post("/avatar", upload.single("profile_image"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "no file" });
        const outName = `${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
        const outPath = path_1.default.join(dir, outName);
        await (0, sharp_1.default)(req.file.path).png().toFile(outPath);
        fs_1.default.unlink(req.file.path, () => { });
        const url = `/uploads/${outName}`;
        return res.json({ success: true, url });
    }
    catch (e) {
        return res.status(500).json({ error: e.message ?? "convert failed" });
    }
});
// GET /users/:id/profile_image  -> คืนเฉพาะรูป
exports.router.get('/:id/profile_image', async (req, res) => {
    const [rows] = await dbconnect_1.conn.query('SELECT profile_image FROM Users WHERE id=?', [req.params.id]);
    const r = rows[0];
    if (!r)
        return res.status(404).json({ error: 'Not found' });
    res.json({ profile_image: r.profile_image }); // ex. "http://localhost:3000/uploads/....png"
});
// ถ้าจะดูของ session ปัจจุบัน
exports.router.get('/me/profile_image', (req, res) => {
    const u = req.session.user;
    if (!u)
        return res.status(401).json({ error: 'Not logged in' });
    res.json({ profile_image: u.profile_image });
});
// --- auth/session ---
exports.router.get("/me", (req, res) => {
    if (!req.session.user)
        return res.status(401).json({ error: "Not logged in" });
    res.json(req.session.user);
});
exports.router.put("/me", isAuth, async (req, res) => {
    const uid = req.session.user.id;
    const { username, email, password, profile_image } = req.body;
    const f = [];
    const v = [];
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
    if (!f.length)
        return res.json({ success: true });
    v.push(uid);
    await dbconnect_1.conn.query(`UPDATE Users SET ${f.join(",")}, updated_at=NOW() WHERE id=?`, v);
    const [rows] = await dbconnect_1.conn.query("SELECT * FROM Users WHERE id = ?", [uid]);
    req.session.user = rows[0];
    res.json({ success: true, user: rows[0] });
});
// --- misc ---
exports.router.post("/logout", (req, res) => {
    req.session.destroy(() => { res.clearCookie("connect.sid"); res.json({ success: true }); });
});
exports.router.get("/", async (_req, res) => {
    const [rows] = await dbconnect_1.conn.query("SELECT * FROM Users");
    res.json(rows);
});
exports.router.get("/:id", async (req, res) => {
    const [rows] = await dbconnect_1.conn.query("SELECT * FROM Users WHERE id = ?", [req.params.id]);
    const users = rows;
    if (!users.length)
        return res.status(404).json({ error: "User not found" });
    res.json(users[0]);
});
exports.router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const [rows] = await dbconnect_1.conn.query("SELECT * FROM Users WHERE username = ? AND password = ?", [username, password]);
    const users = rows;
    if (!users.length)
        return res.status(401).json({ error: "Invalid username or password" });
    req.session.user = users[0];
    res.json({ success: true, user: users[0] });
});
exports.router.post("/register", upload.single("profile_image"), async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const file = req.file;
        const [dup] = await dbconnect_1.conn.query("SELECT 1 FROM Users WHERE username=? OR email=?", [username, email]);
        if (dup.length)
            return res.status(409).json({ error: "Email or username already exists" });
        let profile_image = null;
        if (file) {
            const ext = path_1.default.extname(file.originalname) || '.png';
            const newName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
            const newPath = path_1.default.join(dir, newName);
            fs_1.default.renameSync(file.path, newPath);
            profile_image = `/uploads/${newName}`;
        }
        const [result] = await dbconnect_1.conn.query("INSERT INTO Users (email, username, password, profile_image) VALUES (?, ?, ?, ?)", [email, username, password, profile_image]);
        res.json({ success: true, userId: result.insertId, profile_image });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message || "Register failed" });
    }
});
//# sourceMappingURL=index.js.map