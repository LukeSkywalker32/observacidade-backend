import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
   storage,
   limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
   },
   fileFilter: (_req, file, cb) => {
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
   },
});