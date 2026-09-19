import pino from "pino";

/**
 * Logger estruturado (Pino).
 *
 * - Em dev: pretty-print com cores e timestamp legível
 * - Em prod: JSON puro (parseável por Datadog, Sentry, Render, etc)
 *
 * Performance: ~10x mais rápido que console.log, não bloqueia event loop.
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: {
    service: "observacidade-api",
  },
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname,service",
      },
    },
  }),
});

/**
 * Helper pra criar logger filho com contexto fixo.
 * Use em controllers/services pra adicionar tags automáticas.
 *
 * Exemplo:
 *   const log = logger.child({ context: "geocode" });
 *   log.info("Buscando endereço");
 *   log.error({ err }, "Falha no geocode");
 */
export function childLogger(context: string) {
  return logger.child({ context });
}
