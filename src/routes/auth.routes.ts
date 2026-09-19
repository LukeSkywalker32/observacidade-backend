import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { upload } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";
import { User } from "../models/User";
import { loginSchema, registerSchema } from "../schemas/auth.schema";
import { uploadToCloudinary } from "../services/upload.service";
import { parseBrazilianDate } from "../utils/parseDate";

const router = Router();

router.post(
  "/register",
  upload.single("document"),
  validate(registerSchema),
  async (req, res) => {
    try {
      // Após validate(), req.body já tem CPF normalizado (só dígitos)
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

      // userExists busca por CPF normalizado (setter já cuida disso)
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
        cpf, // já vem normalizado pelo Zod
        birthDate: parseBrazilianDate(birthDate),
        email, // já vem lowercase pelo Zod
        password: hashedPassword,
        documentUrl,
      });

      return res.status(201).json({
        message: "Usuário criado com sucesso",
        userId: user._id,
      });
    } catch (error) {
      console.error("[REGISTER ERROR]", error);
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

      // login pode ser email ou CPF — normaliza ambos pra comparar
      const isCPF = /^\d+$/.test(login.replace(/\D/g, ""));
      const query = isCPF
        ? { cpf: login.replace(/\D/g, "") }
        : { email: login.trim().toLowerCase() };

      const user = await User.findOne(query);

      if (!user) {
        return res.status(400).json({ message: "Credenciais inválidas" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(400).json({ message: "Credenciais inválidas" });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: "1d" },
      );

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
      console.error("[LOGIN ERROR]", error);
      return res.status(500).json({ message: "Erro no login" });
    }
  },
);

export default router;