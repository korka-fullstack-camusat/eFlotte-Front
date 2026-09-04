/**
 * Cache GET en mémoire avec TTL + déduplication des requêtes en vol.
 * Module-level : persiste entre les navigations React (pas de re-fetch au retour sur une page).
 */

interface Entry { data: unknown; ts: number; inflight?: Promise<unknown> }

const store = new Map<string, Entry>();

export const TTL_SHORT  =  20_000;  // 20 s  — données volatiles (stats, KPI)
export const TTL_MEDIUM =  60_000;  // 60 s  — listes paginées
export const TTL_LONG   = 300_000;  // 5 min — référentiels (véhicules, chauffeurs, filtres)

export function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = TTL_MEDIUM,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);

  // Cache chaud → retour immédiat sans réseau
  if (hit && (now - hit.ts) < ttl && !hit.inflight) {
    return Promise.resolve(hit.data as T);
  }

  // Requête déjà en vol → réutiliser la même promesse (pas de doublon)
  if (hit?.inflight) return hit.inflight as Promise<T>;

  // Lancer la requête
  const promise = fetcher()
    .then(data => {
      store.set(key, { data, ts: Date.now() });
      return data;
    })
    .catch(err => {
      // En cas d'erreur, supprimer l'entry pour permettre un retry
      const e = store.get(key);
      if (e) store.set(key, { ...e, inflight: undefined });
      throw err;
    });

  store.set(key, { data: hit?.data, ts: hit?.ts ?? 0, inflight: promise });
  return promise;
}

/** Invalide toutes les clés qui commencent par `prefix` */
export function invalidate(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

/** Invalide tout le cache (ex : après logout) */
export function invalidateAll() { store.clear(); }
