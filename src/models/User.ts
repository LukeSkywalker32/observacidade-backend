import { Schema, model } from "mongoose";
/**
 * Schema de Refresh Token armazenado no User
 * 
 * NÃO salvamos o token em si - só o hash SHA256
 * Se o banco vazar, os token nao podem ser usados diretamente
 */
const RefreshTokenSchema = new Schema ({
  //Hash SHA256 do refresh token
  tokenHash: { type: String, require: true},
  // ID unico do token(jti) - p revogar individualmente
  jti: {type: String, require: true},
  //Quando o token expira
  expiresAt: { type: Date, require: true},
  //Info de device(opcional, pra sair de todos os dispositivos)
  userAgent: { type: String},
  ip: { type: String},

},
{ timestamps: true},
);

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
    refreshTokens: { type: [RefreshTokenSchema], default: [] },
  },
  { timestamps: true }
);

//limpeza automatica de refresh tokens expirados(a cada 24h)
 userSchema.index({ "refreshTokens.expiresAt": 1 }, { expireAfterSeconds: 0 });

export const User = model("User", userSchema);