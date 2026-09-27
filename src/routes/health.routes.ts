import { type Request, type Response, Router } from "express";
import mongoose from "mongoose";
import { childLogger } from "../config/logger";

const router = Router();
const log = childLogger("health.route");

router.get("/", async (_req: Request, res: Response) => {
    //Opcional: ping no mongo pra garantir conexao ativa
    const readyState = mongoose.connection.readyState;

    if (readyState !== 1) {
      log.warn({ readyState }, "MongoDB não esta conectado");
      return res.status(503).json({
        status: "down",
        mongoDB: "down",
        readyState,
        reason: `MongoDB readyState=${readyState}`,
        timestamp: new Date().toISOString()
      })
    }

    try {
      await mongoose.connection.db?.admin().ping();
      return res.json({
        status: "ok",
        mondoDB: "up",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      log.error({
        err: error 
      }, "Falha no ping do MongoDB");

      return res.status(503).json({
      status: "down",
      mongodb: "down",
      reason: message,
      timestamp: new Date().toISOString(),
      })
    }
})
export default router