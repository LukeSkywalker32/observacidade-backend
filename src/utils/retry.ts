import { logger } from "../config/logger";

interface RetryOptions {
  /** Quantas vezes tentar no total (default: 3) */
  attempts?: number;
  /** Delay inicial em ms (default: 500) */
  initialDelay?: number;
  /** Multiplicador do delay entre tentativas (default: 2) */
  backoffFactor?: number;
  /** Delay máximo entre tentativas em ms (default: 5000) */
  maxDelay?: number;
  /** Função que decide se deve tentar de novo (default: só em erros de rede/5xx) */
  shouldRetry?: (error: unknown) => boolean;
  /** Contexto pra log */
  context?: string;
}

/**
 * Retry com backoff exponencial.
 *
 * Tenta executar `fn`. Se falhar, espera `initialDelay`,
 * depois `initialDelay * backoffFactor`, etc, até `attempts` vezes.
 *
 * Útil pra chamadas externas (Geoapify, Cloudinary, etc) que podem
 * ter flakiness momentânea.
 *
 * Exemplo:
 *   const data = await retry(() => axios.get(url), {
 *     attempts: 3,
 *     context: "geoapify.geocode",
 *   });
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    attempts = 3,
    initialDelay = 500,
    backoffFactor = 2,
    maxDelay = 5000,
    shouldRetry = defaultShouldRetry,
    context = "retry",
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === attempts;
      const willRetry = !isLastAttempt && shouldRetry(error);

      logger.warn(
        {
          context,
          attempt,
          maxAttempts: attempts,
          willRetry,
          err: serializeError(error),
        },
        `Tentativa ${attempt}/${attempts} falhou`,
      );

      if (!willRetry) {
        break;
      }

      // Espera antes de tentar de novo
      await sleep(delay);
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

function defaultShouldRetry(error: unknown): boolean {
  // Axios error com response 4xx (exceto 408, 429) NÃO devem ser retentados
  // 5xx e erros de rede (sem response) SIM
  if (error && typeof error === "object" && "isAxiosError" in error) {
    const axiosError = error as { response?: { status?: number } };
    const status = axiosError.response?.status;
    if (status === undefined) return true; // erro de rede
    if (status >= 500) return true;
    if (status === 408 || status === 429) return true;
    return false;
  }
  // Pra outros erros, tenta de novo por padrão
  return true;
}

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack && { stack: error.stack.split("\n").slice(0, 3).join("\n") }),
    };
  }
  return error;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
