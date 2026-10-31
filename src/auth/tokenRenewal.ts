// Renouvellement transparent du jeton de connexion (27 octobre 2026).
//
// Le serveur donne maintenant une durée de vie aux jetons de l'app (30 jours).
// Quand l'échéance approche, chaque réponse porte l'en-tête « X-Token-Renew: 1 » :
// l'app demande alors un nouveau jeton (POST /auth/refresh) en arrière-plan, le
// garde dans le trousseau pour les prochains lancements, et remplace l'ancien
// dans toutes les requêtes qui suivent. La personne ne voit rien : pas de
// reconnexion. L'ancien jeton reste accepté une minute par le serveur, le temps
// que les requêtes déjà parties aboutissent.
//
// Ce module enveloppe `fetch` et ne touche pas au contexte API (ApiContext,
// fichier figé) : celui-ci continue d'envoyer le jeton qu'il connaît, et c'est
// ici qu'il est remplacé par le nouveau. Il ajoute aussi l'identifiant de
// l'appareil (X-Device-Id) à l'inscription, un des signaux de la protection
// anti-robots du serveur, à la place de l'ancienne limite par adresse IP.
//
// Logique pure et testable (npm test) ; le branchement sur le téléphone est
// dans installTokenRenewal.ts.

export type TokenStorage = {
  // Nouveau jeton à garder pour le prochain lancement (même clé que l'app)
  writeToken(token: string): Promise<void>;
  // Identifiant d'appareil : lu, ou créé puis gardé s'il n'existe pas
  deviceId(): Promise<string | null>;
};

export type TokenRenewalOptions = {
  apiBaseUrl: string;
  fetchImpl: typeof fetch;
  storage: TokenStorage;
  // Appelé quand un renouvellement échoue (journal, Sentry…) ; facultatif
  onError?: (error: unknown) => void;
};

export const RENEW_HEADER = 'x-token-renew';
export const DEVICE_HEADER = 'X-Device-Id';
const REFRESH_PATH = '/auth/refresh';
const REGISTER_PATH = '/auth/register';

// Lit l'en-tête Authorization quelle que soit la forme des en-têtes
function readHeader(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) {
    const found = headers.find(([k]) => k.toLowerCase() === name.toLowerCase());
    return found ? found[1] : null;
  }
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? (headers as Record<string, string>)[key] : null;
}

function withHeader(headers: HeadersInit | undefined, name: string, value: string): HeadersInit {
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const copy = new Headers(headers);
    copy.set(name, value);
    return copy;
  }
  if (Array.isArray(headers)) {
    return [...headers.filter(([k]) => k.toLowerCase() !== name.toLowerCase()), [name, value]];
  }
  const copy: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
  for (const k of Object.keys(copy)) if (k.toLowerCase() === name.toLowerCase()) delete copy[k];
  copy[name] = value;
  return copy;
}

function bearerOf(headers: HeadersInit | undefined): string | null {
  const auth = readHeader(headers, 'Authorization');
  if (!auth) return null;
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m ? m[1] : null;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

// Identifiant d'appareil : 32 caractères hexadécimaux, aléatoires, sans lien
// avec l'identifiant matériel du téléphone
export function newDeviceId(): string {
  const c = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') return String(c.randomUUID()).replace(/-/g, '');
  let id = '';
  while (id.length < 32) id += Math.floor(Math.random() * 16).toString(16);
  return id;
}

export function createTokenRenewal(options: TokenRenewalOptions) {
  const { apiBaseUrl, fetchImpl, storage, onError } = options;
  // ancien jeton → nouveau (chaîne possible après plusieurs renouvellements)
  const replacements = new Map<string, string>();
  // renouvellements en cours, par jeton d'origine
  const inFlight = new Map<string, Promise<void>>();

  const current = (token: string): string => {
    let t = token;
    const seen = new Set<string>();
    while (replacements.has(t) && !seen.has(t)) {
      seen.add(t);
      t = replacements.get(t)!;
    }
    return t;
  };

  const renew = (token: string): Promise<void> => {
    const pending = inFlight.get(token);
    if (pending) return pending;
    const run = (async () => {
      try {
        const response = await fetchImpl(`${apiBaseUrl}${REFRESH_PATH}`, {
          method: 'POST',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const json: any = await response.json().catch(() => null);
        const fresh = json?.data?.token ?? json?.token;
        if (typeof fresh !== 'string' || fresh === '') return;
        replacements.set(token, fresh);
        await storage.writeToken(fresh).catch((e) => onError?.(e));
      } catch (e) {
        onError?.(e);
      } finally {
        inFlight.delete(token);
      }
    })();
    inFlight.set(token, run);
    return run;
  };

  const wrappedFetch: typeof fetch = async (input, init) => {
    const url = urlOf(input);
    if (!url.startsWith(apiBaseUrl)) return fetchImpl(input, init);

    let headers = init?.headers;
    const sent = bearerOf(headers);
    if (sent) {
      const replacement = current(sent);
      if (replacement !== sent) headers = withHeader(headers, 'Authorization', `Bearer ${replacement}`);
    }
    if (url === `${apiBaseUrl}${REGISTER_PATH}` && (init?.method ?? 'GET').toUpperCase() === 'POST') {
      const id = await storage.deviceId().catch(() => null);
      if (id) headers = withHeader(headers, DEVICE_HEADER, id);
    }

    const response = await fetchImpl(input, headers === init?.headers ? init : { ...init, headers });

    const token = sent ? current(sent) : null;
    if (token && url !== `${apiBaseUrl}${REFRESH_PATH}` && response.headers.get(RENEW_HEADER) === '1') {
      // En arrière-plan : la réponse en cours n'attend pas le renouvellement
      void renew(token);
    }
    return response;
  };

  return {
    fetch: wrappedFetch,
    // Jeton effectivement envoyé pour un jeton connu de l'app (tests, diagnostic)
    current,
    // Attend la fin des renouvellements en cours (tests)
    settle: () => Promise.all([...inFlight.values()]).then(() => undefined),
  };
}
