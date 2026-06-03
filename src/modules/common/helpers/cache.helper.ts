import { Cache } from 'cache-manager';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface QueryOptions<T> {
    /** Chave única para identificar este resultado no cache */
    key: string;
    /** Função que executa o SQL */
    query: () => Promise<T>;
    /** Tipo de operação HTTP — determina se invalida cache */
    method?: HttpMethod;
    /** TTL em segundos (só para GET). Default: 60s */
    ttl?: number;
    /**
     * Chaves a invalidar quando method = POST | PUT | PATCH | DELETE.
     * Aceita strings exactas ou prefixos com wildcard: 'user_*'
     */
    invalidate?: string[];
}

export class CacheHelper {
    constructor(private readonly cache: Cache) { }

    /**
     * Executa uma query com cache inteligente:
     * - GET  → tenta cache primeiro, guarda resultado se não existir
     * - POST | PUT | PATCH | DELETE → executa SQL e invalida as chaves indicadas
     */
    async run<T>(options: QueryOptions<T>): Promise<T> {
        const { key, query, method = 'GET', ttl = 60, invalidate = [] } = options;

        if (method === 'GET') {
            return this.getOrSet<T>(key, query, ttl);
        }

        // Mutação: executa o SQL e depois invalida cache
        const result = await query();
        await this.invalidateKeys([key, ...invalidate]);
        return result;
    }

    // ─── Métodos de conveniência ───────────────────────────────────────────────

    get<T>(key: string, query: () => Promise<T>, ttl = 60) {
        return this.run<T>({ key, query, method: 'GET', ttl });
    }

    post<T>(query: () => Promise<T>, invalidate: string[] = []) {
        return this.run<T>({ key: '', query, method: 'POST', invalidate });
    }

    put<T>(key: string, query: () => Promise<T>, invalidate: string[] = []) {
        return this.run<T>({ key, query, method: 'PUT', invalidate: [key, ...invalidate] });
    }

    patch<T>(key: string, query: () => Promise<T>, invalidate: string[] = []) {
        return this.run<T>({ key, query, method: 'PATCH', invalidate: [key, ...invalidate] });
    }

    delete<T>(key: string, query: () => Promise<T>, invalidate: string[] = []) {
        return this.run<T>({ key, query, method: 'DELETE', invalidate: [key, ...invalidate] });
    }

    // ─── Internos ──────────────────────────────────────────────────────────────

    private async getOrSet<T>(
        key: string,
        query: () => Promise<T>,
        ttl: number,
    ): Promise<T> {
        const cached = await this.cache.get<T>(key);
        if (cached !== undefined && cached !== null) return cached;

        const data = await query();
        await this.cache.set(key, data, ttl);
        return data;
    }

    /**
     * Invalida uma lista de chaves.
     * Suporta wildcard no final: 'orders_user_*' apaga todas as chaves
     * que comecem com 'orders_user_'
     */
    private async invalidateKeys(keys: string[]): Promise<void> {
        const unique = [...new Set(keys.filter(Boolean))];

        await Promise.all(
            unique.map(async (key) => {
                if (key.endsWith('*')) {
                    await this.invalidateByPrefix(key.slice(0, -1));
                } else {
                    await this.cache.del(key);
                }
            }),
        );
    }

    /**
     * Apaga todas as chaves em cache que comecem com o prefixo dado.
     * Funciona com cache-manager v5+ (que expõe cache.store.keys()).
     */
    private async invalidateByPrefix(prefix: string): Promise<void> {
        const store = (this.cache as any).store;

        if (typeof store?.keys === 'function') {
            const allKeys: string[] = await store.keys();
            const toDelete = allKeys.filter((k) => k.startsWith(prefix));
            await Promise.all(toDelete.map((k) => this.cache.del(k)));
        }
    }
}