import { Router, Request, Response } from "express";
import { getCityFromCoordinates } from "../services/geocode.service";

const router = Router();

router.get("/city", async (req: Request, res: Response) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json("Latitude e longitude são obrigatórias")
        }
        const city = await getCityFromCoordinates(
            parseFloat(lat as string),
            parseFloat(lng as string)
        );
        return res.json({ city })
    } catch (error) {
        return res.status(500).json({ message: "Erro ao buscar cidade" })
    }
})

export default router;
