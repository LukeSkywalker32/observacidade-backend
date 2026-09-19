import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Occurrence } from "../models/Occurrence";
import { geoCoordinatesFromAddress } from "../services/geocode.service";


// POST /api/private/occurrences
export async function createOccurrence(
  req: AuthRequest,
  res: Response,
  _next: NextFunction,
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        message: "Usuário não autenticado",
      });
    }
    const { type, address, description } = req.body as {
      type: string;
      address: string;
      description: string;
    };

    //------------------------------GEOCODING--------------------------------
    const { latitude, longitude, state, city } =
      await geoCoordinatesFromAddress(address);

    const occurrence = await Occurrence.create({
      userId,
      type,
      address,
      description,
      state,
      city,
      latitude,
      longitude,
    });

    return res.status(201).json(occurrence);
  } catch (error) {
    const message =
    error instanceof Error ? error.message: "Erro ao criar ocorrência";
    console.error("[CREATE OCCURRENCE ERROR]", error);

      // se for erro de geocoding, devolve 422
      if (message.includes("Endereço") || message.includes("Geocoding")) {
        return res.status(422).json({message})
      }
      return res.status(500).json({message: "Erro ao criar ocorrência"})
    }
}

//GET /api/public/occurrences - publica, com paginação
export async function listOccurrences(
  req: Request,
  res: Response
) {
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

    const skip = (page -1 ) * limit;
    const [occurrences, total] = await Promise.all([
      Occurrence.find(filter)
      .select("-userId")
      .sort({ createdAt: -1})
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
    })    
  } catch (error) {
    console.error("[LIST OCCUREENCES ERROR]",error);
    return res.status(500).json({message: "Erro ao buscar ocorrências"});
  }
}

// GET /api/private/occurrences/me — minhas ocorrências, com paginação
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
    console.error("[LIST MY OCCURRENCES ERROR]", error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar suas ocorrências" });
  }
}

// GET /api/admin/occurrences — auditoria (admin)
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
    console.error("[LIST ADMIN OCCURRENCES ERROR]", error);
    return res.status(500).json({ message: "Erro ao buscar ocorrências" });
  }
}