import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    fullName: z
      .string({ message: "Nome completo é obrigatório" })
      .trim()
      .min(3, "Nome deve ter no mínimo 3 caracteres")
      .max(100, "Nome deve ter no máximo 100 caracteres"),
    rg: z
      .string({ message: "RG é obrigatório" })
      .min(7, "RG inválido")
      .max(15, "RG inválido"),
    cpf: z
      .string({ message: "CPF é obrigatório" })
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v.length === 11, "CPF deve ter 11 dígitos"),
    birthDate: z
      .string({ message: "Data de nascimento é obrigatória" })
      .regex(
        /^\d{2}\/\d{2}\/\d{4}$/,
        "Data deve estar no formato DD/MM/AAAA",
      ),
    email: z
      .string({ message: "Email é obrigatório" })
      .email("Email inválido")
      .transform((v) => v.trim().toLowerCase()),
    password: z
      .string({ message: "Senha é obrigatória" })
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .max(100, "Senha deve ter no máximo 100 caracteres"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    login: z
      .string({ message: "Login é obrigatório" })
      .trim()
      .min(3, "Login inválido"),
    password: z
      .string({ message: "Senha é obrigatória" })
      .min(1, "Senha é obrigatória"),
  }),
});
