/**
 * Cache GET avec TTL + déduplication des requêtes en vol.
 * Module-level : persiste entre les navigations React (pas de re-fetch au retour sur une page).
 *
 * Les réponses sont aussi gardées dans le navigateur (localStorage) : au rechargement de
 * la page, `peekCached` rend tout de suite les derniers chiffres connus pendant que la
 * page les redemande à l'API (affichage sans attente, puis mise à jour).
 */

interface Entry { data: unknown; ts: number; inflight?: Promise<unknown> }

const store = new Map<string, Entry>();

export const TTL_SHORT  =  20_000;  // 20 s  — données volatiles (stats, KPI)
export const TTL_MEDIUM =  60_000;  // 60 s  — listes paginées
export const TTL_LONG   = 300_000;  // 5 min — référentiels (véhicules, chauffeurs, filtres)

const PREFIXE       = "eflotte_cache:";
const TAILLE_MAX    = 400_000;               // caractères par réponse gardée
const AGE_MAX_DISQUE = 7 * 24 * 3600 * 1000; // au-delà, une réponse gardée est ignorée

function lireDisque(key: string): Entry | undefined {
  try {
    const brut = localStorage.getItem(PREFIXE + key);
    if (!brut) return undefined;
    const e = JSON.parse(brut) as Entry;
    return Date.now() - e.ts < AGE_MAX_DISQUE ? e : undefined;
  } catch {
    return undefined;
  }
}

function ecrireDisque(key: string, data: unknown, ts: number) {
  try {
    const brut = JSON.stringify({ data, ts });
    if (brut.length <= TAILLE_MAX) localStorage.setItem(PREFIXE + key, brut);
  } catch {
    // stockage plein ou indisponible (navigation privée) : le cache mémoire suffit
  }
}

function viderDisque(prefix = "") {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIXE + prefix)) localStorage.removeItem(k);
    }
  } catch {
    // stockage indisponible
  }
}

/** Dernière valeur connue (mémoire, sinon navigateur), même expirée — pour un premier affichage immédiat. */
export function peekCached<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (hit?.data !== undefined) return hit.data as T;
  const disque = lireDisque(key);
  if (disque) {
    store.set(key, { data: disque.data, ts: 0 }); // ts 0 : sera redemandée à l'API
    return disque.data as T;
  }
  return undefined;
}

/** Garde une réponse obtenue hors de getCached (ex. liste chargée par la page elle-même). */
export function garderCache(key: string, data: unknown) {
  const ts = Date.now();
  store.set(key, { data, ts });
  ecrireDisque(key, data, ts);
}

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
      const ts = Date.now();
      store.set(key, { data, ts });
      ecrireDisque(key, data, ts);
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
  viderDisque(prefix);
}

/** Invalide tout le cache (ex : après logout ou import) */
export function invalidateAll() {
  store.clear();
  viderDisque();
}
