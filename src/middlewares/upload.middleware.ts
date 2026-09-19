import type { Request } from "express";
import multer, { FileFilterCallback } from "multer";

const storage = multer.memoryStorage();

/**
 * Filtro de tipo de arquivo.
 *
 * Multer 2.x exporta os tipos diretamente (File, FileFilterCallback).
 * Não precisa mais de @types/multer nem de augmentation global via
 * `Express.Multer.File`.
 */
function fileFilter(
  _req: Request,
  file: multer.File,
  cb: FileFilterCallback,
) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Formato de arquivo inválido"));
  }
}

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});
