"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
exports.router = express_1.default.Router();
const dir = path_1.default.resolve("uploads");
fs_1.default.mkdirSync(dir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
        cb(null, Date.now() + "-" + Math.random().toString(16).slice(2) + ".png");
    }
});
const upload = (0, multer_1.default)({ storage });
exports.router.post("/avatar", upload.single("profile_image"), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: "no file" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
});
//# sourceMappingURL=upload.js.map