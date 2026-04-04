import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";


export async function isAdmin(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const user = await User.findById(req.userId);

    if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({
            message: "Acesso restrito a administradores",
        })
    }

    next();
}