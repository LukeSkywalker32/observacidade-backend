import multer from "multer";

const storage = multer.memoryStorage();

function fileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
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

const multerInstance = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

export const upload = {
  single: (field: string) =>
    multerInstance.single(field) as unknown as express.RequestHandler,
  array: (field: string, max?: number) =>
    multerInstance.array(field, max) as unknown as express.RequestHandler,
  fields: (fields: multer.Field[]) =>
    multerInstance.fields(fields) as unknown as express.RequestHandler,
  any: () => multerInstance.any() as unknown as express.RequestHandler,
};

// Import tardio do namespace express (necessário pro cast funcionar)
// Evita problema de augmentação circular
import type * as express from "express";

