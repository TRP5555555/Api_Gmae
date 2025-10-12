// server.ts
import express from "express";
import session from "express-session";
import path from "path";
import cors from "cors";

import { router as users } from "./controller/index";

export const app = express();

// --- CORS setup ---
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept']
}));


// --- JSON parser (สำหรับ API JSON) ---
app.use(express.json({ limit: "5mb" }));

// --- Upload folder ---
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads'); 

// --- Session ---
app.use(session({
  secret: "my_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// --- Serve uploads folder ---
app.use('/uploads', express.static(UPLOAD_DIR));

// --- Routes ---
app.use("/users", users);

// --- Fallback route ---
app.get("/", (_req, res) => res.send("Server is running..."));
