import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { connectDatabase } from "./config/database";
import { logger } from "./config/logger";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import geocodeRoutes from "./routes/geocode.routes";
import privateRoutes from "./routes/private.routes";
import publicRoutes from "./routes/public.routes";

const app = express();
const log = logger.child({ context: "server" });

app.use(helmet());

/**
 * CORS permissivo — aceita qualquer origin.
 *
 * POR QUE: esta API usa JWT em header Authorization (não cookies),
 * então não tem risco de CSRF. CORS estrito aqui só quebra clientes
 * legítimos (APK Capacitor, alguns navegadores, requests internas).
 *
 * SEGURANÇA REAL fica por:
 * - JWT obrigatório em rotas privadas
 * - Rate limit (anti brute-force)
 * - Helmet (headers de segurança)
 * - Validação Zod (input malicioso)
 * - bcrypt nas senhas
 */
app.use(
  cors({
    origin: true, // ← aceita qualquer origin (incluindo null, undefined, file://)
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Rate limit global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas requisições. Tente novamente em alguns minutos." },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas. Tente novamente em 15 minutos." },
  skipSuccessfulRequests: true,
});

app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "ObservaCidade API" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/private", privateRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/geocode", geocodeRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction,
  ) => {
    log.error({ err }, "Erro não tratado");
    res.status(500).json({ message: "Erro interno do servidor" });
  },
);

const PORT = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      log.info({ port: PORT }, `🔥 Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    log.fatal({ err }, "Falha ao iniciar servidor");
    process.exit(1);
  });
