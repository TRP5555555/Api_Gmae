import express from "express";
import session from "express-session";
import path from "path";
import cors from "cors";

import { router as users } from "./controller/index";
import walletRouter from './controller/wallet'; // ✅ เพิ่มตรงนี้

export const app = express();

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept']
}));

app.use(express.json({ limit: "5mb" }));
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads'); 

app.use(session({
  secret: "my_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use('/uploads', express.static(UPLOAD_DIR));

app.use("/users", users);

// ✅ เพิ่ม wallet router
app.use("/api/wallet", walletRouter);

app.get("/", (_req, res) => res.send("Server is running..."));
