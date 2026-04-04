import { geoCoordinatesFromAddress } from "../services/geocode.service";

import { Request, Response } from "express";
import { Occurrence } from "../models/Occurrence";

export async function createOccurrence(req: Request, res: Response) {
  try {
    const { type, address, description } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Usuário não autenticado",
      });
    }

    if (!type || !address || !description) {
      return res.status(400).json({
        message: "Todos os campos são obrigatórios",
      });
    }
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
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Erro ao criar ocorrência",
    });
  }
}

//rota publica para listar ocorrencias
export async function listOccurrences(req: Request, res: Response) {
  try {
    const occurrences = await Occurrence.find()
      .select("-userId")
      .sort({ createdAt: -1 });

    return res.json(occurrences);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar ocorrências",
    });
  }
}

//rota par alistar minha ocorrencias
export async function listMyOccurrences(req: Request, res: Response) {
  try {
    const userId = req.userId;

    const occurrences = await Occurrence.find({ userId }).sort({
      createdAt: -1,
    });

    return res.json(occurrences);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar suas ocorrências",
    });
  }
}

//rota para auditoria de ocorrencias
export async function listAllOccurrencesAdmin(req: Request, res: Response) {
  try {
    const occurrences = await Occurrence.find()
      .populate("userId", "fullName email cpf rg")
      .sort({ createdAt: -1 });

    return res.json(occurrences);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar ocorrências",
    });
  }
}
