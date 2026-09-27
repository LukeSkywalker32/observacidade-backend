import { Router } from "express";
import { cacheMiddleware } from "../middlewares/cache.middleware";
import {
  listOccurrences,
  listOccurrencesNear,
} from "../controllers/occurrence.controller";

const router = Router();

router.get("/map", (_req, res) => {
  return res.json({
    message: "Mapa público acessível",
  });
});

/**
 * GET /api/public/occurrences
 * Cacheado por 30s (read-only)
 */
router.get("/occurrences", cacheMiddleware({ ttl: 30 }), listOccurrences);

/**
 * GET /api/public/occurrences/near 
 * Query params: lat, lng, radiusKm (opcional, default 5)
 * Cacheado por 30s (mas com key incluindo lat/lng/radius)
 */
router.get(
  "/occurrences/near",
  cacheMiddleware({ ttl: 30 }),
  listOccurrencesNear,
);

export default router;
