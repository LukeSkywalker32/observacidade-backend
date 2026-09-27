import jwt, { SignOptions } from "jsonwebtoken";

/**
 * Helpers de JWT.
 *
 * Dois tipos de token:
 * - Access: curta duração (15min), usado em toda request
 * - Refresh: longa duração (7 dias), usado SÓ pra renovar access
 */

const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET =
  (process.env.JWT_REFRESH_SECRET as string) || ACCESS_SECRET + "-refresh";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface AccessTokenPayload {
  id: string;
  role: "USER" | "ADMIN";
}

export interface RefreshTokenPayload {
  id: string;
  /** Identificador único do token — permite revogar individualmente */
  jti: string;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, ACCESS_SECRET, options);
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  const options: SignOptions = {
    expiresIn: REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}


/**
 * Gera um ID único pra token (pra revogação individual).
 */
export function generateTokenId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}
/**
 * Hash do refresh token antes de salvar no banco.
 * Mesmo se o banco vazar, os tokens não podem ser usados diretamente.
 */
export function hashToken(token: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha256").update(token).digest("hex");
}