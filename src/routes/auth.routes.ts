import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { upload } from "../middlewares/upload.middleware";
import { User } from "../models/User";
import { uploadToCloudinary } from "../services/upload.service";
import { parseBrazilianDate } from "../utils/parseDate";

const router = Router();

router.post("/register", upload.single("document"), async (req, res) => {
	try {
		const { fullName, rg, cpf, birthDate, email, password } = req.body;
		const parsedBirthDate = new Date(birthDate);

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

		return res.status(201).json({
			message: "Usuário criado com sucesso",
			userId: user._id,
		});
	} catch (error) {
		return res.status(500).json({
			message: "Erro no cadastro",
			error: error,
		});
	}
});
router.post("/login", async (req, res) => {
	try {
		const { login, password } = req.body;

		const user = await User.findOne({
			$or: [{ email: login }, { cpf: login }],
		});

		if (!user) {
			return res.status(400).json({ message: "Credenciais inválidas" });
		}

		const passwordMatch = await bcrypt.compare(password, user.password);

		if (!passwordMatch) {
			return res.status(400).json({ message: "Credenciais inválidas" });
		}

		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
			expiresIn: "1d",
		});

		return res.json({
			token,
			user: {
				id: user._id,
				fullName: user.fullName,
				email: user.email,
				cpf: user.cpf,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: "Erro no login" });
	}
});

export default router;
