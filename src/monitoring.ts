import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

import { monitoringEnabled, scrubEvent } from '@/src/utils/monitoring';

// Suivi des plantages : Sentry, actif seulement dans la version publiée
// (jamais en développement ni dans Expo Go), et seulement si l'adresse
// d'envoi a été donnée à la construction (variable EXPO_PUBLIC_SENTRY_DSN,
// réglée dans l'environnement « production » d'EAS, jamais dans le dépôt).
// Sans donnée personnelle : ni e-mail, ni identifiant de compte, ni montant,
// ni capture d'écran, ni mesure d'audience ou de performance (voir
// utils/monitoring.ts pour le nettoyage de chaque rapport).

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const MONITORING_ON = monitoringEnabled(__DEV__, DSN);

// Écrans parcourus avant un plantage (noms de routes), branchée sur la
// navigation dans app/_layout.tsx
export const navigationIntegration = Sentry.reactNavigationIntegration({ enableTimeToInitialDisplay: false });

export function initMonitoring(): void {
  Sentry.init({
    dsn: DSN,
    enabled: MONITORING_ON,
    environment: 'production',
    sendDefaultPii: false,
    // Plantages seulement : pas de traces de performance, pas de sessions,
    // pas de requêtes réseau en échec, pas d'images de l'écran
    tracesSampleRate: 0,
    enableAutoPerformanceTracing: false,
    enableAutoSessionTracking: false,
    enableCaptureFailedRequests: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    maxBreadcrumbs: 30,
    integrations: [navigationIntegration],
    beforeSend: (event) => scrubEvent(event),
    // Fil d'Ariane : les écrans parcourus, rien d'autre (ni console, ni
    // requêtes, ni touchers)
    beforeBreadcrumb: (breadcrumb) => (breadcrumb.category === 'navigation' ? breadcrumb : null),
  });
  if (MONITORING_ON) {
    // Quelle version du code tournait : la mise à jour à distance appliquée, s'il y en a une
    Sentry.setTag('mise_a_jour', Updates.updateId ?? 'embarquee');
    Sentry.setTag('canal', Updates.channel ?? 'aucun');
  }
}

// Erreur rattrapée par un écran de secours (AppErrorScreen) : envoyée avec
// le nom de l'endroit où elle s'est produite
export function captureError(where: string, error: unknown): void {
  if (!MONITORING_ON) return;
  try {
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), { tags: { endroit: where } });
  } catch {
    // le suivi ne doit jamais faire planter l'écran de secours
  }
}

// Enveloppe du composant racine : capte les erreurs non rattrapées
export const wrapRoot = Sentry.wrap;
