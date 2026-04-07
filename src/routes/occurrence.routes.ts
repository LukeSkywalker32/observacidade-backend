import { Router } from "express";
import {
	createOccurrence,
	listMyOccurrences,
	listOccurrences,
} from "../controllers/occurrence.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authMiddleware, createOccurrence); //criar ocorrencia
router.get("/me", authMiddleware, listMyOccurrences); //listar minhas ocorrencias
router.get("/", listOccurrences); //listar todas as ocorrencias

export default router;
