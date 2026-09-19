import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    rg: {
      type: String,
      required: true,
      set: (v: string)=> v.replace(/[^a-zA-Z0-9]/g,"").toUpperCase(),
    },
    cpf: {
      type: String,
      required: true,
      unique: true,
      set: (v: string) => v.replace(/\D/g, ""),
      validate: {
        validator: (v:string) => /^\d{11}$/.test(v),
        message: "CPF deve ter exatamente 11 dígitos",
      },
    },
    birthDate: {
      type: Date,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    documentFile: {
      type: String,
    },
    documentUrl: {
      type: String,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    documentStatus: {
      type: String,
      enum: ["PENDENTE", "APROVADO", "REPROVADO"],
      default: "PENDENTE",
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },
  },
  { timestamps: true }
);

// Índices secundários pra busca rápida (cpf e email já criam índice por unique)
// userSchema.index({ documentStatus: 1 }); // habilite se for pesquisar muito por status
// userSchema.index({ fullName: 1 });        // habilite se for usar search por nome

export const User = model("User", userSchema);