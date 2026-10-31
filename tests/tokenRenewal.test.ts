/// <reference types="node" />
// Lancer : npm test
// Renouvellement transparent du jeton de connexion (src/auth/tokenRenewal.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTokenRenewal, DEVICE_HEADER, newDeviceId, RENEW_HEADER } from '../src/auth/tokenRenewal';

const API = 'https://api.exemple.test/api';

type Call = { url: string; method: string; headers: Record<string, string> };

// Serveur simulé : rend la main sur chaque appel, demande le renouvellement quand `renew` est vrai
function serveur(options: { renew?: () => boolean; refreshOk?: boolean; refreshToken?: string } = {}) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as any).url ?? String(input);
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw instanceof Headers) raw.forEach((v, k) => (headers[k.toLowerCase()] = v));
    else if (Array.isArray(raw)) raw.forEach(([k, v]) => (headers[k.toLowerCase()] = v));
    else if (raw) Object.entries(raw).forEach(([k, v]) => (headers[k.toLowerCase()] = String(v)));
    calls.push({ url, method: (init?.method ?? 'GET').toUpperCase(), headers });

    if (url === `${API}/auth/refresh`) {
      if (options.refreshOk === false) return new Response('{"message":"non"}', { status: 401 });
      return new Response(JSON.stringify({ data: { token: options.refreshToken ?? '2|nouveau', token_expires_at: '2026-11-26T10:00:00+01:00' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    const h: Record<string, string> = { 'content-type': 'application/json' };
    if (options.renew?.()) h[RENEW_HEADER] = '1';
    return new Response('{"data":{"ok":true}}', { status: 200, headers: h });
  };
  return { calls, fetchImpl };
}

function stockage() {
  const written: string[] = [];
  return {
    written,
    storage: {
      writeToken: async (t: string) => void written.push(t),
      deviceId: async () => 'appareil-de-test-0001',
    },
  };
}

test('sans demande du serveur, rien ne change : jeton envoyé tel quel, aucun renouvellement', async () => {
  const { calls, fetchImpl } = serveur();
  const { written, storage } = stockage();
  const { fetch: f, settle } = createTokenRenewal({ apiBaseUrl: API, fetchImpl, storage });

  const r = await f(`${API}/user`, { headers: { Authorization: 'Bearer 1|ancien', Accept: 'application/json' } });
  await settle();

  assert.equal(r.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.authorization, 'Bearer 1|ancien');
  assert.deepEqual(written, []);
});

test('X-Token-Renew : renouvellement en arrière-plan, jeton gardé, remplacé dans les requêtes suivantes', async () => {
  let demander = true;
  const { calls, fetchImpl } = serveur({ renew: () => demander });
  const { written, storage } = stockage();
  const { fetch: f, settle, current } = createTokenRenewal({ apiBaseUrl: API, fetchImpl, storage });

  const r = await f(`${API}/user`, { headers: { Authorization: 'Bearer 1|ancien' } });
  assert.equal(r.status, 200, 'la réponse en cours n’attend pas le renouvellement');
  await settle();
  demander = false;

  assert.deepEqual(written, ['2|nouveau'], 'le nouveau jeton est gardé pour le prochain lancement');
  assert.equal(current('1|ancien'), '2|nouveau');
  const refresh = calls.find((c) => c.url === `${API}/auth/refresh`)!;
  assert.equal(refresh.method, 'POST');
  assert.equal(refresh.headers.authorization, 'Bearer 1|ancien', 'le renouvellement part avec le jeton encore valide');

  // Le contexte API continue d'envoyer l'ancien jeton : il est remplacé
  await f(`${API}/progress`, { headers: new Headers({ Authorization: 'Bearer 1|ancien' }) });
  await f(`${API}/modules`, { headers: [['Authorization', 'Bearer 1|ancien']] });
  const [progress, modules] = calls.slice(-2);
  assert.equal(progress.headers.authorization, 'Bearer 2|nouveau');
  assert.equal(modules.headers.authorization, 'Bearer 2|nouveau');
});

test('plusieurs réponses qui demandent le renouvellement en même temps : un seul appel', async () => {
  const { calls, fetchImpl } = serveur({ renew: () => true });
  const { written, storage } = stockage();
  const { fetch: f, settle } = createTokenRenewal({ apiBaseUrl: API, fetchImpl, storage });

  await Promise.all([
    f(`${API}/user`, { headers: { Authorization: 'Bearer 1|ancien' } }),
    f(`${API}/progress`, { headers: { Authorization: 'Bearer 1|ancien' } }),
    f(`${API}/modules`, { headers: { Authorization: 'Bearer 1|ancien' } }),
  ]);
  await settle();

  assert.equal(calls.filter((c) => c.url === `${API}/auth/refresh`).length, 1);
  assert.deepEqual(written, ['2|nouveau']);
});

test('renouvellements successifs : la chaîne ancien → nouveau → plus récent est suivie', async () => {
  let jeton = '2|nouveau';
  const { fetchImpl, calls } = serveur({ renew: () => true, refreshToken: undefined });
  const impl: typeof fetch = (input, init) => {
    const url = typeof input === 'string' ? input : String(input);
    if (url === `${API}/auth/refresh`) {
      return Promise.resolve(new Response(JSON.stringify({ data: { token: jeton } }), { status: 200 }));
    }
    return fetchImpl(input, init);
  };
  const { storage } = stockage();
  const { fetch: f, settle, current } = createTokenRenewal({ apiBaseUrl: API, fetchImpl: impl, storage });

  await f(`${API}/user`, { headers: { Authorization: 'Bearer 1|ancien' } });
  await settle();
  jeton = '3|plus-recent';
  await f(`${API}/user`, { headers: { Authorization: 'Bearer 1|ancien' } }); // envoyé avec 2|nouveau, renouvelé en 3
  await settle();

  assert.equal(current('1|ancien'), '3|plus-recent');
  await f(`${API}/user`, { headers: { Authorization: 'Bearer 1|ancien' } });
  assert.equal(calls.at(-1)!.headers.authorization, 'Bearer 3|plus-recent');
});

test('renouvellement refusé (jeton déjà révoqué) : rien ne change, l’erreur est signalée sans planter', async () => {
  const { fetchImpl } = serveur({ renew: () => true, refreshOk: false });
  const { written, storage } = stockage();
  const erreurs: unknown[] = [];
  const { fetch: f, settle, current } = createTokenRenewal({ apiBaseUrl: API, fetchImpl, storage, onError: (e) => erreurs.push(e) });

  await f(`${API}/user`, { headers: { Authorization: 'Bearer 1|ancien' } });
  await settle();

  assert.equal(current('1|ancien'), '1|ancien');
  assert.deepEqual(written, []);
  assert.equal(erreurs.length, 0, 'un refus n’est pas une erreur de code');
});

test('réseau coupé pendant le renouvellement : signalé, retenté à la prochaine demande', async () => {
  let panne = true;
  const base = serveur({ renew: () => true });
  const impl: typeof fetch = (input, init) => {
    const url = typeof input === 'string' ? input : String(input);
    if (url === `${API}/auth/refresh` && panne) return Promise.reject(new TypeError('Network request failed'));
    return base.fetchImpl(input, init);
  };
  const { written, storage } = stockage();
  const erreurs: unknown[] = [];
  const { fetch: f, settle, current } = createTokenRenewal({ apiBaseUrl: API, fetchImpl: impl, storage, onError: (e) => erreurs.push(e) });

  await f(`${API}/user`, { headers: { Authorization: 'Bearer 1|ancien' } });
  await settle();
  assert.equal(erreurs.length, 1);
  assert.equal(current('1|ancien'), '1|ancien');

  panne = false;
  await f(`${API}/user`, { headers: { Authorization: 'Bearer 1|ancien' } });
  await settle();
  assert.equal(current('1|ancien'), '2|nouveau');
  assert.deepEqual(written, ['2|nouveau']);
});

test('les requêtes sans jeton, hors API ou de renouvellement ne déclenchent rien', async () => {
  const { calls, fetchImpl } = serveur({ renew: () => true });
  const { written, storage } = stockage();
  const { fetch: f, settle } = createTokenRenewal({ apiBaseUrl: API, fetchImpl, storage });

  await f(`${API}/universes`, { headers: { Accept: 'application/json' } });
  await f('https://ailleurs.exemple.test/x', { headers: { Authorization: 'Bearer 1|ancien' } });
  await f(`${API}/auth/refresh`, { method: 'POST', headers: { Authorization: 'Bearer 1|ancien' } });
  await settle();

  assert.equal(calls.filter((c) => c.url === `${API}/auth/refresh`).length, 1, 'seul l’appel explicite');
  assert.deepEqual(written, []);
});

test('l’inscription part avec l’identifiant de l’appareil, pas les autres requêtes', async () => {
  const { calls, fetchImpl } = serveur();
  const { storage } = stockage();
  const { fetch: f } = createTokenRenewal({ apiBaseUrl: API, fetchImpl, storage });

  await f(`${API}/auth/register`, { method: 'POST', headers: { Accept: 'application/json' }, body: '{}' });
  await f(`${API}/auth/login`, { method: 'POST', headers: { Accept: 'application/json' }, body: '{}' });

  assert.equal(calls[0].headers[DEVICE_HEADER.toLowerCase()], 'appareil-de-test-0001');
  assert.equal(calls[0].headers.accept, 'application/json', 'les autres en-têtes sont conservés');
  assert.equal(calls[1].headers[DEVICE_HEADER.toLowerCase()], undefined);
});

test('identifiant d’appareil : 32 caractères hexadécimaux, différent à chaque création', () => {
  const a = newDeviceId();
  const b = newDeviceId();
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.notEqual(a, b);
});
