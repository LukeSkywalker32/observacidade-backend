import { Router } from "express";
import { listAllOccurrencesAdmin } from "../controllers/occurrence.controller";
import { isAdmin } from "../middlewares/admin.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";
import { Occurrence } from "../models/Occurrence";
import { User } from "../models/User";

const router = Router();

//Primeiro valida o token
router.use(authMiddleware);
//Depois valida se é admin
router.use(isAdmin);

router.get("/users", async (req, res) => {
	try {
		const page = Number(req.query.page) || 1;
		const limit = Number(req.query.limit) || 50;

		const skip = (page - 1) * limit;
		const { status, search } = req.query;
		const filter: any = {};

		//Filtro por status
		if (status) {
			filter.documentStatus = status;
		}

		//Busca por nome ou email
		if (search) {
			filter.$or = [
				{ fullName: { $regex: search, $options: "i" } },
				{ email: { $regex: search, $options: "i" } },
			];
		}

		const users = await User.find(filter)
			.select("-password")
			.skip(skip)
			.limit(limit)
			.sort({ createdAt: -1 });

		const totalUsers = await User.countDocuments(filter);
		const totalPages = Math.ceil(totalUsers / limit);

		return res.json({
			page,
			limit,
			totalUsers,
			totalPages,
			users,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ error: "Erro ao buscar usuários" });
	}
});
router.get("/users/pending", async (req, res) => {
	try {
		const users = await User.find({
			documentStatus: "PENDENTE",
		}).select("-password");

		return res.json(users);
	} catch (error) {
		return res.status(500).json({
			error: "Erro ao listar usuários pendentes",
		});
	}
});
router.patch("/users/:id/approve", async (req, res) => {
	try {
		const user = await User.findByIdAndUpdate(
			req.params.id,
			{ documentStatus: "APROVADO" },
			{ new: true },
		).select("-password");

		if (!user) {
			return res.status(404).json({
				error: "Usuário não encontrado",
			});
		}

		return res.json({
			message: "Documento aprovado com sucesso",
			user,
		});
	} catch (error) {
		return res.status(500).json({
			error: "Erro ao aprovar documento",
		});
	}
});
router.patch("/users/:id/reject", async (req, res) => {
	try {
		const { reason } = req.body;
		const user = await User.findByIdAndUpdate(
			req.params.id,
			{
				documentStatus: "REPROVADO",
				rejectionReason: reason,
			},
			{ new: true },
		).select("-password");

		if (!user) {
			return res.status(404).json({
				message: "Usuário não encontrado",
			});
		}

		return res.json({
			message: "Documento reprovado",
			user,
		});
	} catch (error) {
		return res.status(500).json({
			message: "Erro ao reprovar documento",
		});
	}
});
router.delete("/users/:id", async (req, res) => {
	try {
		const user = await User.findByIdAndDelete(req.params.id);
		if (!user) {
			return res.status(404).json({
				message: "Usuário não encontrado",
			});
		}
		return res.json({
			message: "Usuário excluído com sucesso",
			user,
		});
	} catch (error) {
		return res.status(500).json({
			message: "Erro ao excluir usuário",
		});
	}
});
router.delete("/occurrences/:id", async (req, res) => {
	try {
		const { reason } = req.body;

		if (!reason) {
			return res.status(400).json({
				message: "Motivo da exclusão é obrigatório",
			});
		}

		const occurrence = await Occurrence.findByIdAndDelete(req.params.id);

		if (!occurrence) {
			return res.status(404).json({
				message: "Ocorrência não encontrada",
				reason,
			});
		}
		return res.json({
			message: "Ocorrência excluída com sucesso",
			reason,
		});
	} catch (error) {
		return res.status(500).json({
			message: "Erro ao excluir ocorrência",
		});
	}
});
router.get("/occurrences", listAllOccurrencesAdmin);

export default router;
