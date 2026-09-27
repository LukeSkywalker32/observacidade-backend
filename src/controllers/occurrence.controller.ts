import { NextFunction, Request, Response } from "express";
import { childLogger } from "../config/logger";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Occurrence } from "../models/Occurrence";
import { geoCoordinatesFromAddress } from "../services/geocode.service";
import { clearCache } from "../middlewares/cache.middleware";

const log = childLogger("occurrence");

// POST /api/private/occurrences
export async function createOccurrence(
  req: AuthRequest,
  res: Response,
  _next: NextFunction,
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const { type, address, description } = req.body as {
      type: string;
      address: string;
      description: string;
    };

    // Sprint 6: aceita lat/lng direto do frontend (evita chamada extra ao geocode)
    let latitude: number;
    let longitude: number;
    let state: string;
    let city: string;

    const bodyLat = (req.body as { latitude?: number }).latitude;
    const bodyLng = (req.body as { longitude?: number }).longitude;

    if (typeof bodyLat === "number" && typeof bodyLng === "number") {
      // Frontend já tem coordenadas — usa direto
      latitude = bodyLat;
      longitude = bodyLng;
      // Geocodifica só pra extrair state/city (ou usa do frontend se vier)
      state = (req.body as { state?: string }).state || "Desconhecido";
      city = (req.body as { city?: string }).city || "Desconhecido";
      log.debug({ latitude, longitude, city, state }, "Coordenadas vindas do front");
    } else {
      // Fallback: geocodifica o endereço
      log.debug({ address }, "Geocoding fallback (front não enviou lat/lng)");
      const geocoded = await geoCoordinatesFromAddress(address);
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
      state = geocoded.state;
      city = geocoded.city;
    }

    const occurrence = await Occurrence.create({
      userId,
      type,
      address,
      description,
      state,
      city,
      latitude,
      longitude,
      // GeoJSON format: [longitude, latitude] (NÃO [lat, lng])
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });

    // Invalida cache de listagem — agora tem 1 ocorrência nova
    clearCache();

    log.info(
      {
        occurrenceId: occurrence._id.toString(),
        userId,
        type,
        city,
      },
      "Ocorrência criada",
    );

    return res.status(201).json(occurrence);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar ocorrência";
    log.error({ err: error, userId: req.userId }, "Erro ao criar ocorrência");

    if (message.includes("Endereço") || message.includes("Geocoding")) {
      return res.status(422).json({ message });
    }

    return res.status(500).json({ message: "Erro ao criar ocorrência" });
  }
}

// GET /api/public/occurrences — com cache
export async function listOccurrences(req: Request, res: Response) {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      city,
      state,
    } = req.query as {
      page?: number;
      limit?: number;
      type?: string;
      city?: string;
      state?: string;
    };

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (city) filter.city = city;
    if (state) filter.state = state;

    const skip = (page - 1) * limit;

    const [occurrences, total] = await Promise.all([
      Occurrence.find(filter)
        .select("-userId -location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Occurrence.countDocuments(filter),
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      occurrences,
    });
  } catch (error) {
    log.error({ err: error }, "Erro ao listar ocorrências públicas");
    return res.status(500).json({ message: "Erro ao buscar ocorrências" });
  }
}

/**
 * GET /api/public/occurrences/near — Sprint 6
 *
 * Query params:
 * - lat: latitude do ponto central (obrigatório)
 * - lng: longitude do ponto central (obrigatório)
 * - radiusKm: raio em km (default: 5, max: 100)
 * - limit: máximo de ocorrências (default: 50)
 *
 * Usa $nearSphere do MongoDB (com 2dsphere index) pra buscar
 * ocorrências dentro do raio, ordenadas por distância.
 */
export async function listOccurrencesNear(req: Request, res: Response) {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = Math.min(
      parseFloat((req.query.radiusKm as string) || "5"),
      100,
    );
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res
        .status(400)
        .json({ message: "Parâmetros lat e lng são obrigatórios" });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res
        .status(400)
        .json({ message: "Coordenadas fora do range válido" });
    }

    const occurrences = await Occurrence.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat], // [longitude, latitude]!
          },
          $maxDistance: radiusKm * 1000, // metros
        },
      },
    })
      .select("-userId -location")
      .limit(limit);

    return res.json({
      center: { lat, lng },
      radiusKm,
      count: occurrences.length,
      occurrences,
    });
  } catch (error) {
    log.error({ err: error }, "Erro ao buscar ocorrências próximas");
    return res
      .status(500)
      .json({ message: "Erro ao buscar ocorrências próximas" });
  }
}

// GET /api/private/occurrences/me
export async function listMyOccurrences(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const {
      page = 1,
      limit = 50,
    } = req.query as {
      page?: number;
      limit?: number;
    };

    const skip = (page - 1) * limit;

    const [occurrences, total] = await Promise.all([
      Occurrence.find({ userId })
        .select("-location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Occurrence.countDocuments({ userId }),
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      occurrences,
    });
  } catch (error) {
    log.error({ err: error, userId: req.userId }, "Erro ao listar minhas ocorrências");
    return res
      .status(500)
      .json({ message: "Erro ao buscar suas ocorrências" });
  }
}

// GET /api/admin/occurrences
export async function listAllOccurrencesAdmin(req: Request, res: Response) {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      city,
      state,
    } = req.query as {
      page?: number;
      limit?: number;
      type?: string;
      city?: string;
      state?: string;
    };

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (city) filter.city = city;
    if (state) filter.state = state;

    const skip = (page - 1) * limit;

    const [occurrences, total] = await Promise.all([
      Occurrence.find(filter)
        .populate("userId", "fullName email cpf rg")
        .select("-location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Occurrence.countDocuments(filter),
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      occurrences,
    });
  } catch (error) {
    log.error({ err: error }, "Erro ao listar ocorrências admin");
    return res.status(500).json({ message: "Erro ao buscar ocorrências" });
  }
}
