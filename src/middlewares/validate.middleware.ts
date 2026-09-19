import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

/**
 * Middleware genérico de validação Zod.
 * Aceita schemas que validem { body, query, params }.
 *
 * Exemplo de schema:
 *   z.object({
 *     body: z.object({ email: z.string().email() }),
 *     query: z.object({ page: z.coerce.number().min(1) }).optional(),
 *     params: z.object({ id: z.string() }).optional(),
 *   })
 */
export function validate(schema: ZodType) {
   return (req: Request, res: Response, next: NextFunction) => {
      const result = schema.safeParse({
         body: req.body,
         query: req.query,
         params: req.params,
      });

      if (!result.success) {
         res.status(400).json({
            message: "Dados inválidos",
            errors: result.error.flatten(),
         });
         return;
      }

      const data = result.data as {
         body: unknown;
         query: unknown;
         params: unknown;
      };

      if (data.body) req.body = data.body;
      if (data.query) {
         Object.assign(req.query, data.query);
      }
      if (data.params) {
         Object.assign(req.params, data.params);
      }

      next();
   };
}
