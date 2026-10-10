import { API_BASE_URL } from '@/src/context/ApiContext';
import { AuthFailure, parseAuthFailure } from './authErrors';

export type AuthResponse = { ok: true } | { ok: false; failure: AuthFailure };

// Appel à une route d'authentification (même adresse que ApiContext) dont on
// lit la réponse complète : register et login d'ApiContext ne gardent que le
// message à la racine, pas le code ni error.message. Lève en cas d'échec du
// réseau, comme fetch.
export async function postAuth(path: string, body: Record<string, unknown>): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.ok) return { ok: true };
  const json = await response.json().catch(() => null);
  return { ok: false, failure: parseAuthFailure(response.status, json) };
}
