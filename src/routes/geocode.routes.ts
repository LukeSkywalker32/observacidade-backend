import { type Request, type Response, Router } from "express";
import {
  autocompleteAddress,
  geoCoordinatesFromAddress,
  getCityFromCoordinates,
} from "../services/geocode.service";

const router = Router();

/**
 * Proxy do Geoapify.
 * Antes a chave ia no bundle do front-end.
 * Agora o front chama esses endpoints, e a chave fica só no .env do back.
 *
 * GET /api/geocode/search?text=Rua+Das+Flores+123+SP
 * GET /api/geocode/reverse?lat=-23.5&lng=-46.6
 * GET /api/geocode/autocomplete?text=Rua+Das&lat=-23.5&lng=-46.6
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { text } = req.query;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ message: "Parâmetro 'text' é obrigatório" });
    }
    const result = await geoCoordinatesFromAddress(text);
    return res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao buscar endereço";
    console.error("[GEOCODE SEARCH ERROR]", error);
    return res.status(500).json({ message });
  }
});

router.get("/reverse", async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude e longitude são obrigatórias" });
    }
    const city = await getCityFromCoordinates(
      parseFloat(lat as string),
      parseFloat(lng as string),
    );
    return res.json({ city });
  } catch (error) {
    console.error("[GEOCODE REVERSE ERROR]", error);
    return res.status(500).json({ message: "Erro ao buscar cidade" });
  }
});

router.get("/autocomplete", async (req: Request, res: Response) => {
  try {
    const { text, lat, lng } = req.query;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ message: "Parâmetro 'text' é obrigatório" });
    }

    const bias =
      lat && lng
        ? { lat: parseFloat(lat as string), lng: parseFloat(lng as string) }
        : undefined;

    const result = await autocompleteAddress({ text, bias });

    // Devolve no formato cru { results: [...] }
    return res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro no autocomplete";
    console.error("[GEOCODE AUTOCOMPLETE ERROR]", error);
    return res.status(500).json({ message });
  }
});

export default router;
