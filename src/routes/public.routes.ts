import { Router } from "express";
import { listOccurrences } from "../controllers/occurrence.controller";

const router = Router();

router.get("/map", (req, res) => {
    return res.json({
        message: "Mapa público acessível",
    });
});

router.get("/occurrences", listOccurrences);

//console.log("Rota pública criada com sucesso");
export default router;
