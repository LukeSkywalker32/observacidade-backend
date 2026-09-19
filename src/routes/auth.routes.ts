import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { childLogger } from "../config/logger";
import { upload } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";
import { User } from "../models/User";
import { loginSchema, registerSchema } from "../schemas/auth.schema";
import { uploadToCloudinary } from "../services/upload.service";
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

router.post(
  "/login",
  validate(loginSchema),
  async (req, res) => {
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
        log.warn({ login: login.slice(0, 4) + "***" }, "Login falhou - usuário não existe");
        return res.status(400).json({ message: "Credenciais inválidas" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        log.warn({ userId: user._id.toString() }, "Login falhou - senha incorreta");
        return res.status(400).json({ message: "Credenciais inválidas" });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: "1d" },
      );

      log.info({ userId: user._id.toString() }, "Login bem-sucedido");

      return res.json({
        token,
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
  },
);

export default router;
