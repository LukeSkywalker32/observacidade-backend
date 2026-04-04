import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import { connectDatabase } from "./config/database";

import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import privateRoutes from "./routes/private.routes";
import publicRoutes from "./routes/public.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/private", privateRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Backend ObservaCidade rodando");
});

const PORT = 5000;

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
  });
});
