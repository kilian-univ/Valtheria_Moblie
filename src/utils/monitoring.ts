// Suivi des plantages (Sentry), partie pure : décider s'il est actif, et
// nettoyer chaque rapport avant envoi. Jamais d'e-mail, jamais de montant,
// jamais de jeton, jamais d'identifiant de compte. Testable avec Node.

// Actif seulement dans la version publiée, et seulement si une adresse
// d'envoi (DSN) a été donnée à la construction (EXPO_PUBLIC_SENTRY_DSN)
export function monitoringEnabled(isDev: boolean, dsn: string | undefined): boolean {
  return !isDev && typeof dsn === 'string' && dsn.trim() !== '';
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// « 1 234,56 € », « 12 €», « 1 234 euros », « 12.5 EUR »
const AMOUNT = /\d[\d\s  .,]*\s?(?:€|euros?\b|eur\b)/gi;
// En-tête d'autorisation et jeton Sanctum (« 12|abc… »)
const BEARER = /Bearer\s+[A-Za-z0-9|._-]+/g;
const TOKEN = /\b\d+\|[A-Za-z0-9]{20,}\b/g;

// Texte d'un message ou d'une erreur, sans ce qui identifie la personne
export function scrubText(text: string): string {
  return text.replace(BEARER, 'Bearer [jeton]').replace(TOKEN, '[jeton]').replace(EMAIL, '[e-mail]').replace(AMOUNT, '[montant]');
}

type Breadcrumb = { category?: string; type?: string; message?: string; data?: unknown; [key: string]: unknown };

// Les champs du rapport que l'on touche ; le reste (appareil, version, trace)
// passe tel quel
export type MonitoringEvent = {
  user?: unknown;
  request?: unknown;
  extra?: unknown;
  message?: string;
  exception?: { values?: { value?: string; [key: string]: unknown }[]; [key: string]: unknown };
  breadcrumbs?: Breadcrumb[];
  contexts?: { device?: { name?: unknown; [key: string]: unknown }; [key: string]: unknown };
  [key: string]: unknown;
};

// Rapport prêt à partir : sans personne (user), sans requête, sans données
// libres (extra), sans nom d'appareil ; textes nettoyés ; fil d'Ariane
// réduit aux écrans parcourus (navigation), sans leurs données
export function scrubEvent<T extends object>(event: T): T {
  const out: MonitoringEvent = { ...(event as MonitoringEvent) };
  delete out.user;
  delete out.request;
  delete out.extra;
  if (typeof out.message === 'string') out.message = scrubText(out.message);
  if (out.exception?.values) {
    out.exception = {
      ...out.exception,
      values: out.exception.values.map((v) => ({ ...v, value: typeof v.value === 'string' ? scrubText(v.value) : v.value })),
    };
  }
  out.breadcrumbs = (out.breadcrumbs ?? [])
    .filter((b) => b.category === 'navigation' || b.type === 'navigation')
    .map((b) => ({ ...b, message: typeof b.message === 'string' ? scrubText(b.message) : b.message, data: undefined }));
  if (out.contexts?.device) {
    const { name: _name, ...device } = out.contexts.device;
    out.contexts = { ...out.contexts, device };
  }
  return out as unknown as T;
}
