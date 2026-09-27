import { Router } from "express";
import { requireApprovedDocument } from "../middlewares/document-status.middleware";
import {
  createOccurrence,
  listMyOccurrences,
} from "../controllers/occurrence.controller";

const router = Router();

// Criar ocorrência exige aprovação
router.post("/", requireApprovedDocument, createOccurrence);

// Listar minhas ocorrências exige aprovação
router.get("/me", requireApprovedDocument, listMyOccurrences);

export default router;
