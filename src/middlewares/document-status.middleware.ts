import { NextFunction, Response } from "express";
import { User } from "../models/User";
import { AuthRequest } from "./auth.middleware";

/**
 * Bloqueia a request se o documento NÃO estiver APROVADO.
 *
 * Substitui o antigo `status.middleware.ts` que decidia permissões
 * baseado em `req.path` (string matching frágil).
 *
 * Cada rota agora opta explicitamente se quer ou não exigir aprovação:
 *   - Rotas que usam `requireApprovedDocument`: exigem APROVADO
 *   - Rotas que NÃO usam (avatar, resend-document, /me): qualquer status
 *
 * Exemplo de uso:
 *   router.post("/occurrences", requireApprovedDocument, createOccurrence);
 */
export async function requireApprovedDocument(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await User.findById(req.userId).select(
      "documentStatus rejectionReason",
    );
    if (!user) {
      return res.status(400).json({ message: "Usuario não encontradao"});
    }
    if (user.documentStatus === "APROVADO") {
      return next();
    }
    if (user.documentStatus === "PENDENTE") {
      return res.status(403).json({
        message: "Documento pendente. Aguarda a análise",
      });
    }
    // REPROVADO
    return res.status(403).json({
      message: "Documento reprovado.",
      reason: user.rejectionReason,
    });
  } catch (error) {
    console.error("[DOC STATUS ERROR]",error);
    return res.status(500).json({ message: "Erro ao verificar status do documento" });
  }
}