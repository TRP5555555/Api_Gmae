"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_DIR = exports.app = void 0;
// server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const path_1 = __importDefault(require("path"));
const index_1 = require("./controller/index");
const upload_1 = require("./controller/upload");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({ origin: "http://localhost:4200", credentials: true }));
exports.app.use(express_1.default.json({ limit: "5mb" }));
exports.UPLOAD_DIR = path_1.default.resolve(process.cwd(), 'uploads');
exports.app.use((0, express_session_1.default)({
    secret: "my_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
exports.app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// routes
exports.app.use("/users", index_1.router);
exports.app.use("/uploads", upload_1.router);
exports.app.use('/uploads', express_1.default.static(exports.UPLOAD_DIR));
//# sourceMappingURL=app.js.map