import { API_BASE_URL } from '@/src/context/ApiContext';

// Adresse du site, déduite de celle de l'API (EXPO_PUBLIC_API_URL) : contre le
// staging, les pages du staging (audit C19)
const SITE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

// Pages légales du site (routes web cgu, politique et mentions, routes/web.php),
// publiques malgré la porte d'accès du site (exception du 18/10/2026)
export const TERMS_URL = `${SITE_URL}/cgu`;
export const PRIVACY_URL = `${SITE_URL}/politique-confidentialite`;
export const LEGAL_NOTICE_URL = `${SITE_URL}/mentions-legales`;
// Aide et contact (publique, URL d'assistance de l'App Store)
export const HELP_URL = `${SITE_URL}/aide`;
// Mot de passe oublié, sur le site (routes/auth.php : forgot-password)
export const FORGOT_PASSWORD_URL = `${SITE_URL}/forgot-password`;
