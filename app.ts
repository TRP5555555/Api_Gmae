// app.ts 
import express from "express";
import session from "express-session";
import path from "path";
import cors from "cors";

import { router as users } from "./controller/index";
import walletRouter from './controller/wallet';
import gameRouter from './controller/game';
import cartRouter from './controller/cartPurchaseController';
import { router as historyRouter } from './controller/history';


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
app.use('/users', historyRouter); 

app.use("/api/wallet", walletRouter);
app.use("/games", gameRouter);
app.use('/api/cart', cartRouter);





app.get("/", (_req, res) => res.send("Server is running..."));
