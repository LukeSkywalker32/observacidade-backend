import bcrypt from "bcryptjs";
import { Router } from "express";
import { childLogger } from "../config/logger";
import { clearCache } from "../middlewares/cache.middleware";
import { upload } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";
import { User } from "../models/User";
import { loginSchema, registerSchema } from "../schemas/auth.schema";
import { uploadToCloudinary } from "../services/upload.service";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenId,
  hashToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { parseBrazilianDate } from "../utils/parseDate";

const router = Router();
const log = childLogger("auth");

router.post(
  "/register",
  upload.single("document"),
  validate(registerSchema),
  async (req, res) => {
    try {
      const { fullName, rg, cpf, birthDate, email, password } = req.body as {
        fullName: string;
        rg: string;
        cpf: string;
        birthDate: string;
        email: string;
        password: string;
      };

      if (!req.file) {
        return res.status(400).json({
          message: "Documento é obrigatório",
        });
      }

      const userExists = await User.findOne({
        $or: [{ email }, { cpf }],
      });

      if (userExists) {
        return res.status(400).json({
          message: "Usuário já cadastrado com este CPF ou Email",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const documentUrl = await uploadToCloudinary(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        "observacidade/documentos",
      );

      const user = await User.create({
        fullName,
        rg,
        cpf,
        birthDate: parseBrazilianDate(birthDate),
        email,
        password: hashedPassword,
        documentUrl,
      });

      log.info({ userId: user._id.toString(), email }, "Usuário cadastrado");

      return res.status(201).json({
        message: "Usuário criado com sucesso",
        userId: user._id,
      });
    } catch (error) {
      log.error({ err: error }, "Erro no cadastro");
      return res.status(500).json({
        message: "Erro no cadastro",
      });
    }
  },
);

/**
 * Helper: gera par de tokens e salva refresh no User.
 */
async function issueTokenPair(
  userId: string,
  role: "USER" | "ADMIN",
  req: any,
) {
  const accessToken = generateAccessToken({ id: userId, role });
  const jti = generateTokenId();
  const refreshToken = generateRefreshToken({ id: userId, jti });
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await User.findByIdAndUpdate(userId, {
    $push: {
      refreshTokens: {
        tokenHash,
        jti,
        expiresAt,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      },
    },
  });

  return { accessToken, refreshToken };
}

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { login, password } = req.body as {
      login: string;
      password: string;
    };

    const isCPF = /^\d+$/.test(login.replace(/\D/g, ""));
    const query = isCPF
      ? { cpf: login.replace(/\D/g, "") }
      : { email: login.trim().toLowerCase() };

    const user = await User.findOne(query);

    if (!user) {
      log.warn(
        { login: login.slice(0, 4) + "***" },
        "Login falhou - usuário não existe",
      );
      return res.status(400).json({ message: "Credenciais inválidas" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      log.warn({ userId: user._id.toString() }, "Login falhou - senha incorreta");
      return res.status(400).json({ message: "Credenciais inválidas" });
    }

    // Limpa tokens expirados (cast `as any` pra evitar conflito com DocumentArray)
    const validTokens = (user.refreshTokens as any[]).filter(
      (t) => t.expiresAt && new Date(t.expiresAt) > new Date(),
    );
    user.refreshTokens.splice(0, user.refreshTokens.length, ...validTokens);
    await user.save();

    const tokens = await issueTokenPair(user._id.toString(), user.role, req);

    log.info({ userId: user._id.toString() }, "Login bem-sucedido");

    return res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
        documentStatus: user.documentStatus,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Erro no login");
    return res.status(500).json({ message: "Erro no login" });
  }
});

/**
 * POST /api/auth/refresh
 *
 * Valida refresh, gera novo par, **revoga o antigo** (rotação).
 *
 * Se alguém tentar usar o token antigo de novo, recebe 401.
 */
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken é obrigatório" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res
        .status(401)
        .json({ message: "Refresh token inválido ou expirado" });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    const tokenHash = hashToken(refreshToken);

    // Cast `as any[]` pra evitar conflito com DocumentArray do Mongoose
    const tokens = user.refreshTokens as any[];

    // Verifica se o token está na lista (não foi revogado)
    const tokenExists = tokens.some(
      (t) =>
        t.tokenHash === tokenHash &&
        t.expiresAt &&
        new Date(t.expiresAt) > new Date(),
    );

    if (!tokenExists) {
      log.warn(
        { userId: payload.id, jti: payload.jti },
        "Refresh token não encontrado ou expirado (possível reuso de token revogado)",
      );
      // Possível ataque: revoga TODOS os tokens do usuário
      user.refreshTokens.splice(0, user.refreshTokens.length);
      await user.save();
      return res.status(401).json({ message: "Token revogado" });
    }

    // Remove o token antigo (rotação)
    const remainingTokens = tokens.filter(
      (t) => t.tokenHash !== tokenHash,
    );
    user.refreshTokens.splice(0, user.refreshTokens.length, ...remainingTokens);
    await user.save();

    // Emite novo par
    const newTokens = await issueTokenPair(
      user._id.toString(),
      user.role,
      req,
    );

    return res.json(newTokens);
  } catch (error) {
    log.error({ err: error }, "Erro no refresh");
    return res.status(500).json({ message: "Erro ao renovar token" });
  }
});

/**
 * POST /api/auth/logout — revoga o refresh token atual
 */
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken é obrigatório" });
    }

    const tokenHash = hashToken(refreshToken);

    await User.findOneAndUpdate(
      { "refreshTokens.tokenHash": tokenHash },
      { $pull: { refreshTokens: { tokenHash } } },
    );

    log.info("Logout realizado");

    return res.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    log.error({ err: error }, "Erro no logout");
    return res.status(500).json({ message: "Erro ao fazer logout" });
  }
});

/**
 * POST /api/auth/logout-all — sai de todos os devices
 */
router.post("/logout-all", async (req, res) => {
  try {
    const { userId } = req.body as { userId?: string };

    if (!userId) {
      return res
        .status(400)
        .json({ message: "userId é obrigatório (envie do front)" });
    }

    await User.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    });

    clearCache();
    log.info({ userId }, "Logout-all realizado");

    return res.json({ message: "Sessão encerrada em todos os devices" });
  } catch (error) {
    log.error({ err: error }, "Erro no logout-all");
    return res.status(500).json({ message: "Erro ao sair de todos" });
  }
});

export default router;
