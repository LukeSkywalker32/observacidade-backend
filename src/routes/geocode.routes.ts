import { type Request, type Response, Router } from "express";
import { childLogger } from "../config/logger";
import {
  autocompleteAddress,
  geoCoordinatesFromAddress,
  getCityFromCoordinates,
} from "../services/geocode.service";

const router = Router();
const log = childLogger("geocode.route");

/**
 * Proxy do Geoapify + rotas auxiliares.
 *
 * ROTAS PÚBLICAS (sem auth, via /api/geocode):
 *   GET /api/geocode/search?text=Rua+Das+Flores
 *   GET /api/geocode/reverse?lat=-23.5&lng=-46.6
 *   GET /api/geocode/autocomplete?text=Rua+Das&lat=-23.5&lng=-46.6
 *
 * ROTAS PRIVADAS (via /api/private/geocode, exige aprovação):
 *   GET /api/private/geocode/city?lat=-23.5&lng=-46.6
 *     → Retorna { city: "São Paulo" } pra mostrar no header do app
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { text } = req.query;
    if (!text || typeof text !== "string") {
      return res
        .status(400)
        .json({ message: "Parâmetro 'text' é obrigatório" });
    }
    const result = await geoCoordinatesFromAddress(text);
    return res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao buscar endereço";
    log.error({ err: error }, "Erro no geocode/search");
    return res.status(500).json({ message });
  }
});

router.get("/reverse", async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude e longitude são obrigatórias" });
    }
    const city = await getCityFromCoordinates(
      parseFloat(lat as string),
      parseFloat(lng as string),
    );
    return res.json({ city });
  } catch (error) {
    log.error({ err: error }, "Erro no geocode/reverse");
    return res.status(500).json({ message: "Erro ao buscar cidade" });
  }
});

router.get("/city", async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude e longitude são obrigatórias" });
    }
    const city = await getCityFromCoordinates(
      parseFloat(lat as string),
      parseFloat(lng as string),
    );
    return res.json({ city });
  } catch (error) {
    log.error({ err: error }, "Erro no geocode/city");
    return res.status(500).json({ message: "Erro ao buscar cidade" });
  }
});

router.get("/autocomplete", async (req: Request, res: Response) => {
  try {
    const { text, lat, lng } = req.query;
    if (!text || typeof text !== "string") {
      return res
        .status(400)
        .json({ message: "Parâmetro 'text' é obrigatório" });
    }

    const bias =
      lat && lng
        ? { lat: parseFloat(lat as string), lng: parseFloat(lng as string) }
        : undefined;

    const result = await autocompleteAddress({ text, bias });
    return res.json(result);
  } catch (error) {
    log.error({ err: error }, "Erro no geocode/autocomplete");
    return res.status(500).json({ message: "Erro no autocomplete" });
  }
});

export default router;
