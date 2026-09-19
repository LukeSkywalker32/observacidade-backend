import { Router } from "express";
import { z } from "zod";
import { childLogger } from "../config/logger";
import { listAllOccurrencesAdmin } from "../controllers/occurrence.controller";
import { isAdmin } from "../middlewares/admin.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { Occurrence } from "../models/Occurrence";
import { User } from "../models/User";
import {
  deleteOccurrenceSchema,
  listOccurrencesQuerySchema,
} from "../schemas/occurrence.schema";

const router = Router();
const log = childLogger("admin");

router.use(authMiddleware);
router.use(isAdmin);

const listUsersQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 1))
      .pipe(z.number().int().min(1).max(10000)),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 50))
      .pipe(z.number().int().min(1).max(100)),
    status: z.enum(["PENDENTE", "APROVADO", "REPROVADO"]).optional(),
    search: z.string().trim().min(2).max(100).optional(),
  }),
});

const userIdParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "ID inválido"),
  }),
});

const rejectUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "ID inválido"),
  }),
  body: z.object({
    reason: z
      .string({ message: "Motivo é obrigatório" })
      .trim()
      .min(3, "Motivo deve ter no mínimo 3 caracteres")
      .max(300, "Motivo deve ter no máximo 300 caracteres"),
  }),
});

router.get("/users", validate(listUsersQuerySchema), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query as {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    };
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (status) filter.documentStatus = status;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    return res.json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (error) {
    log.error({ err: error }, "Erro ao listar usuários");
    return res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

router.get("/users/pending", async (_req, res) => {
  try {
    const users = await User.find({
      documentStatus: "PENDENTE",
    }).select("-password");
    return res.json({ users });
  } catch (error) {
    log.error({ err: error }, "Erro ao listar pendentes");
    return res.status(500).json({
      error: "Erro ao listar usuários pendentes",
    });
  }
});

router.patch(
  "/users/:id/approve",
  validate(userIdParamsSchema),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };

      const user = await User.findByIdAndUpdate(
        id,
        { documentStatus: "APROVADO" },
        { new: true },
      ).select("-password");

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      log.info({ userId: id, byAdmin: req.userId }, "Documento aprovado");

      return res.json({
        message: "Documento aprovado com sucesso",
        user,
      });
    } catch (error) {
      log.error({ err: error }, "Erro ao aprovar documento");
      return res.status(500).json({ error: "Erro ao aprovar documento" });
    }
  },
);

router.patch(
  "/users/:id/reject",
  validate(rejectUserSchema),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const { reason } = req.body as { reason: string };

      const user = await User.findByIdAndUpdate(
        id,
        { documentStatus: "REPROVADO", rejectionReason: reason },
        { new: true },
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      log.info({ userId: id, byAdmin: req.userId, reason }, "Documento reprovado");

      return res.json({
        message: "Documento reprovado",
        user,
      });
    } catch (error) {
      log.error({ err: error }, "Erro ao reprovar documento");
      return res.status(500).json({ message: "Erro ao reprovar documento" });
    }
  },
);

router.delete(
  "/users/:id",
  validate(userIdParamsSchema),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      log.warn({ userId: id, byAdmin: req.userId }, "Usuário excluído");

      return res.json({
        message: "Usuário excluído com sucesso",
        user,
      });
    } catch (error) {
      log.error({ err: error }, "Erro ao excluir usuário");
      return res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  },
);

router.delete(
  "/occurrences/:id",
  validate(deleteOccurrenceSchema),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const { reason } = req.body as { reason: string };

      const occurrence = await Occurrence.findByIdAndDelete(id);

      if (!occurrence) {
        return res.status(404).json({
          message: "Ocorrência não encontrada",
          reason,
        });
      }

      log.warn(
        { occurrenceId: id, byAdmin: req.userId, reason },
        "Ocorrência excluída",
      );

      return res.json({
        message: "Ocorrência excluída com sucesso",
        reason,
      });
    } catch (error) {
      log.error({ err: error }, "Erro ao excluir ocorrência");
      return res.status(500).json({ message: "Erro ao excluir ocorrência" });
    }
  },
);

router.get(
  "/occurrences",
  validate(listOccurrencesQuerySchema),
  listAllOccurrencesAdmin,
);

export default router;
