import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { connectDatabase } from "./config/database";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import geocodeRoutes from "./routes/geocode.routes";
import privateRoutes from "./routes/private.routes";
import publicRoutes from "./routes/public.routes";

const app = express();

app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
.split(",")
.map((origin) => origin.trim())
.filter(Boolean);


app.use(
  cors({
    origin: (origin, callback) => {
      // Permite tools tipo Postman/Insomnia (sem origin) só em dev
      if (!origin && process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      if (!origin || allowedOrigins.length === 0) {
        return callback(new Error("Origem não permitida pelo CORS"));
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origem não permitida pelo CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Rate limit global — 100 req / 15min por IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas requisições. Tente novamente em alguns minutos." },
});
app.use(globalLimiter);

// Rate limit específico pra auth — 5 tentativas / 15min por IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas. Tente novamente em 15 minutos." },
  skipSuccessfulRequests: true, // conta só as falhas
});

app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "ObservaCidade API" });
});

// Rotas
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/private", privateRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/geocode", geocodeRoutes);

// Error handler global — loga no servidor, devolve mensagem genérica no client
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction,
  ) => {
    console.error("[ERROR]", err);
    res.status(500).json({ message: "Erro interno do servidor" });
  },
);

const PORT = process.env.PORT || 5000;

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
  });
});
