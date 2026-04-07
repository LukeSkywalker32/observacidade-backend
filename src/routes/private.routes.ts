import { type Request, type Response, Router } from "express";
import cloudinary from "../config/cloudinary";
import { authMiddleware } from "../middlewares/auth.middleware";
import { checkDocumentStatus } from "../middlewares/status.middleware";
import { upload } from "../middlewares/upload.middleware";
import { User } from "../models/User";
import { uploadToCloudinary } from "../services/upload.service";
import geocodeRoutes from "./geocode.routes";
import occurrenceRoutes from "./occurrence.routes";

const router = Router();
//Valida Token
router.use(authMiddleware);
//Valida se o documento está aprovado
router.use(checkDocumentStatus);

router.get("/dashboard", (req, res) => {
	return res.json({
		message: "Área privada do usuário",
	});
});
router.get("/me", async (req: Request, res: Response) => {
	try {
		const user = await User.findById(req.userId).select("-password");
		if (!user) {
			return res.status(404).json({
				message: "Usuário não encontrado",
			});
		}
		return res.json({
			id: user._id,
			fullName: user.fullName,
			email: user.email,
			cpf: user.cpf,
			rg: user.rg,
			birthDate: user.birthDate,
			documentStatus: user.documentStatus,
			documentUrl: user.documentUrl,
			avatarUrl: user.avatarUrl,
			role: user.role,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		});
	} catch (error) {
		return res.status(500).json({
			message: "Erro ao buscar usuário",
		});
	}
});
router.post(
	"/resend-document",
	upload.single("document"),
	async (req: Request, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({
					message: "Documento é obrigatório",
				});
			}
			//Envia o documento para o cloudinary
			const documentUrl = await uploadToCloudinary(
				req.file.buffer,
				req.file.mimetype,
				req.file.originalname,
				"observacidade/documentos",
			);
			//busca usuario atual antes de enviar o novo documento
			const user = await User.findByIdAndUpdate(
				req.userId,
				{
					documentUrl,
					documentStatus: "PENDENTE",
					rejectionReason: null,
				},
				{ new: true },
			);

			return res.json({
				message: "Documento reenviado para análise",
				user,
			});
		} catch (error) {
			return res.status(500).json({
				message: "Erro ao reenviar documento",
			});
		}
	},
);

// Rota para atualizar avatar
router.post(
	"/avatar",
	upload.single("avatar"),
	async (req: Request, res: Response) => {
		try {
			if (!req.file) {
				return res.status(400).json({
					message: "Imagem é Obrigatória",
				});
			}
			// Busca usuario atual antes de enviar o novo avatar
			const existingUser = await User.findById(req.userId);

			//Envia o avatar para o cloudinary
			const avatarUrl = await uploadToCloudinary(
				req.file.buffer,
				req.file.mimetype,
				req.file.originalname,
				"observacidade/avatar",
			);
			//Atualiza o avatar
			const user = await User.findByIdAndUpdate(
				req.userId,
				{ avatarUrl },
				{ new: true },
			).select("-password");

			//Deleta o avatar antigo
			if (existingUser?.avatarUrl) {
				const urlParts = existingUser.avatarUrl.split("/");
				// ↑ divide a URL em partes

				const publicId = urlParts
					.slice(urlParts.indexOf("observacidade"))
					// ↑ pega tudo a partir de "observacidade"
					.join("/")
					.split(".")[0];
				// ↑ remove a extensão .jpg/.png

				await cloudinary.uploader.destroy(publicId);
				// ↑ Cloudinary encontra e deleta a imagem corretamente
			}

			//Retorna o novo avatar
			return res.json({
				message: "Avatar atualizado com sucesso",
				avatarUrl: user?.avatarUrl,
			});
		} catch (error) {
			return res.status(500).json({
				message: "Erro ao atualizar avatar",
			});
		}
	},
);

//Rotas de ocorrências
router.use("/occurrences", occurrenceRoutes);
//Rotas de geocodificação
router.use("/geocode", geocodeRoutes);

export default router;
