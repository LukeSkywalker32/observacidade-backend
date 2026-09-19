import { Router } from "express";
import {
  createOccurrence,
  listMyOccurrences,
} from "../controllers/occurrence.controller";
import { requireApprovedDocument } from "../middlewares/document-status.middleware";

const router = Router();

// Criar ocorrência exige aprovação
router.post("/", requireApprovedDocument, createOccurrence);

// Listar minhas ocorrências exige aprovação (tem dados sensíveis)
router.get("/me", requireApprovedDocument, listMyOccurrences);

export default router;
