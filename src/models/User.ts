import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    rg: {
      type: String,
      required: true,
    },
    cpf: {
      type: String,
      required: true,
      unique: true,
    },
    birthDate: {
      type: Date,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
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

export const User = model("User", userSchema);