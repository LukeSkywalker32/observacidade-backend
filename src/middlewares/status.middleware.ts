import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";


export async function checkDocumentStatus(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                message: "Usuário não encontrado"
            })
        }
        //Se o documento estiver aprovado, libera o acesso
        if (user.documentStatus === "APROVADO") {
            return next();
        }
        //Se o documento estiver pendente, bloqueia o acesso
        if (user.documentStatus === "PENDENTE") {
            if (req.path === "/avatar") {
                return next()
            }
            return res.status(403).json({
                message: "Documento pendente. Aguarde a análise.",
            })
        }
        //Documento rejeitado
        if (user.documentStatus === "REPROVADO") {
            //permitir apenas reenvio do documento
            if (req.path === "/resend-document" || req.path === "/avatar") {
                return next();
            }
            return res.status(403).json({
                message: "Documento rejeitado. Envie novamente um documento válido.",
                reason: user.rejectionReason,
            })
        }

        next();
    } catch (error) {
        return res.status(500).json({
            message: "Erro ao verificar status do documento",
        })

    }
}