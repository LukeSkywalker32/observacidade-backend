import { randomUUID } from "crypto";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary";
import { childLogger } from "../config/logger";

const log = childLogger("upload");

/**
 * Upload pro Cloudinary.
 *
 * IMPORTANTE: o `public_id` agora usa UUID ao invés de `originalName`.
 * Antes era `originalName.split(".")[0]` — se dois usuários fizessem
 * upload do mesmo `rg_frente.jpg`, o segundo sobrescrevia o primeiro.
 *
 * Mantemos o nome original só no `context` pra auditoria.
 */
export function uploadToCloudinary(
  fileBuffer: Buffer,
  mimetype: string,
  originalName: string,
  folder: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const publicId = randomUUID();

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        type: "upload",
        public_id: publicId,
        context: {
          originalName,
          mimetype,
          uploadedAt: new Date().toISOString(),
        },
      },
      (error, result) => {
        if (error) {
          log.error({ err: error, folder, publicId }, "Falha no upload Cloudinary");
          return reject(error);
        }
        if (result) {
          log.info(
            {
              folder,
              publicId,
              originalName,
              size: result.bytes,
            },
            "Upload concluído",
          );
          return resolve(result.secure_url);
        }
      },
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
}

/**
 * Extrai o public_id de uma URL do Cloudinary.
 * Usado pra deletar arquivo antigo antes de subir novo (avatar).
 */
export function extractPublicIdFromUrl(url: string, folderMarker: string): string | null {
  try {
    const urlParts = url.split("/");
    const folderIndex = urlParts.indexOf(folderMarker);
    if (folderIndex === -1) return null;
    return urlParts.slice(folderIndex).join("/").split(".")[0];
  } catch {
    return null;
  }
}
