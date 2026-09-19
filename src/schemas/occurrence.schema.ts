import { z } from "zod";

export const OCCURRENCE_TYPE_ENUM = [
  "furto",
  "roubo",
  "assalto",
  "atividade suspeita",
  "vandalismo",
  "outros",
] as const;

export const createOccurrenceSchema = z.object({
  body: z.object({
    type: z.enum(OCCURRENCE_TYPE_ENUM, {
      message: "Tipo de ocorrência inválido",
    }),
    address: z
      .string({ message: "Endereço é obrigatório" })
      .trim()
      .min(5, "Endereço deve ter no mínimo 5 caracteres")
      .max(300, "Endereço deve ter no máximo 300 caracteres"),
    description: z
      .string({ message: "Descrição é obrigatória" })
      .trim()
      .min(5, "Descrição deve ter no mínimo 5 caracteres")
      .max(400, "Descrição deve ter no máximo 400 caracteres"),
  }),
});

export const listOccurrencesQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 1))
      .pipe(z.number().int().min(1).max(10000)),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 50))
      .pipe(z.number().int().min(1).max(100)),
    type: z.enum(OCCURRENCE_TYPE_ENUM).optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
  }),
});

export const deleteOccurrenceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "ID inválido"),
  }),
  body: z.object({
    reason: z
      .string({ message: "Motivo é obrigatório" })
      .trim()
      .min(3, "Motivo deve ter no mínimo 3 caracteres")
      .max(300, "Motivo deve ter no máximo 300 caracteres"),
  }),
});
