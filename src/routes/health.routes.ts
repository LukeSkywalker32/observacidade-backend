import { Router } from "express"

const router = Router();

router.get("/", async (_req, res) => {
  try {
    //Opcional: ping no mongo pra garantir conexao ativa
    const mongoose =await import("mongoose");
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
    }
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return res.status(503).json({
      status: "down",
      error: String(error),
      timestamp: new Date().toISOString()
    })
  }
})
export default router