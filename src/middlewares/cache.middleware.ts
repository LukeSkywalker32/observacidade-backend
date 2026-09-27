import { NextFunction, Request, Response } from "express";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

/**
 * Cache in-memory simples para rotas GET publicas
 * 
 * Para produção com multiplas instancias, troque por Redis.
 * Para unica instancia, Map em memoria é o suficiente.
 * 
 * Cache key = metodo + path completo + query string
 * TTL configuravel por rota
 */
class SimpleCache {
  private store = new Map<string, CacheEntry>();
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;

    //Limpa entradas expiradas a cada 5m
    setInterval(
      ()=> {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
          if (entry.expiresAt <now) {
            this.store.delete(key);
          }
        }
      },
      5 * 60 * 100
    );
  }

  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null
    }
    return entry.data;
  }

  set(key: string, data: unknown, ttlSeconds: number): void {
    // LRU básico: se passou do limite, remove o mais antigo
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey)
    }
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
  clear(): void {
    this.store.clear();
  }
}

  export const cache = new SimpleCache(500);

  interface CacheOptions {
    ttl?: number
}
/**
 * Middleware de cache.
 *
 * Aplica só em GET. Cacheia o JSON da resposta.
 * Invalida automaticamente após TTL.
 *
 * Bypassa cache se header `Cache-Control: no-cache` vier na request.
 *
 * Exemplo:
 *   router.get("/occurrences", cacheMiddleware({ ttl: 30 }), handler);
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const { ttl = 30 } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    //só recheia GET
  if (req.method !== "GET") return next();
  // Bypass se pediu explicitamente
  if (req.headers["cache-control"] === "no-cache") return next()

    const key = `${req.method}:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      res.setHeader("XCache","HIT");
      res.json(cached);
      return
    }
    //Intercepta o res.json pra salvar no cache antes de enviar
    const originalJson = res.json.bind(res);
    res.json = (body:unknown) => {
      // só recheia respostas 2xx
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key,body, ttl);
        res.setHeader("X-Cache","MISS")
        res.setHeader("Cache-Control", `public, max-age=${ttl}`)
      }
      return originalJson(body)
    };
    next();
  };
}

/**
 * Invalida todo o cache (use após mutações críticas).
 * Exemplo: após criar uma ocorrência, limpa o cache da listagem.
 */
export function clearCache():void{
  cache.clear()
}