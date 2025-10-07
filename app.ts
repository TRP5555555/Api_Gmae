// server.ts
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";

import { router as users } from "./controller/index";
import { router as upload } from "./controller/upload";


export const app = express();

app.use(cors({ origin: "http://localhost:4200", credentials: true }));
app.use(express.json({ limit: "5mb" }));           
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

app.use(session({
  secret: "my_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// routes
app.use("/users", users);
app.use("/uploads", upload);
app.use('/uploads', express.static(UPLOAD_DIR));
