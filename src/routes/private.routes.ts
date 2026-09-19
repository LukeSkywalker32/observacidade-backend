import { type Request, type Response, Router } from "express";
import cloudinary from "../config/cloudinary";
import { childLogger } from "../config/logger";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireApprovedDocument } from "../middlewares/document-status.middleware";
import { upload } from "../middlewares/upload.middleware";
import { User } from "../models/User";
import { uploadToCloudinary } from "../services/upload.service";
import geocodeRoutes from "./geocode.routes";
import occurrenceRoutes from "./occurrence.routes";

const router = Router();
const log = childLogger("private");

// Todas as rotas exigem autenticação
router.use(authMiddleware);

// /me — pode ser acessada com qualquer status (usuário quer ver o próprio perfil mesmo pendente)
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
    log.error({ err: error }, "Erro ao buscar usuário");
    return res.status(500).json({
      message: "Erro ao buscar usuário",
    });
  }
});

// /resend-document — pode reenviar se PENDENTE ou REPROVADO (NÃO exige approved)
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

      const documentUrl = await uploadToCloudinary(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        "observacidade/documentos",
      );

      const user = await User.findByIdAndUpdate(
        req.userId,
        {
          documentUrl,
          documentStatus: "PENDENTE",
          rejectionReason: null,
        },
        { new: true },
      );

      log.info({ userId: req.userId }, "Documento reenviado para análise");

      return res.json({
        message: "Documento reenviado para análise",
        user,
      });
    } catch (error) {
      log.error({ err: error }, "Erro ao reenviar documento");
      return res.status(500).json({
        message: "Erro ao reenviar documento",
      });
    }
  },
);

// /avatar — pode trocar a qualquer momento (NÃO exige approved)
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

      const existingUser = await User.findById(req.userId);

      const avatarUrl = await uploadToCloudinary(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        "observacidade/avatar",
      );

      const user = await User.findByIdAndUpdate(
        req.userId,
        { avatarUrl },
        { new: true },
      ).select("-password");

      // Deleta o avatar antigo (se existir)
      if (existingUser?.avatarUrl) {
        const urlParts = existingUser.avatarUrl.split("/");
        const publicId = urlParts
          .slice(urlParts.indexOf("observacidade"))
          .join("/")
          .split(".")[0];

        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          log.warn({ err, publicId }, "Falha ao deletar avatar antigo (não-bloqueante)");
        }
      }

      return res.json({
        message: "Avatar atualizado com sucesso",
        avatarUrl: user?.avatarUrl,
      });
    } catch (error) {
      log.error({ err: error }, "Erro ao atualizar avatar");
      return res.status(500).json({
        message: "Erro ao atualizar avatar",
      });
    }
  },
);

// /occurrences/* — exige aprovação (cada sub-rota opt-in)
router.use("/occurrences", requireApprovedDocument, occurrenceRoutes);

// /geocode/* — exige aprovação (city lookup só faz sentido pra usuário homologado)
router.use("/geocode", requireApprovedDocument, geocodeRoutes);

export default router;
