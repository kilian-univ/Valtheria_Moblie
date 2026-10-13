/// <reference types="node" />
// Lancer : npm test
// Préchargement des images au démarrage (utils/preload.ts) : ne fait jamais
// planter l'app, quelle que soit la plateforme

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { preloadAll } from '../src/utils/preload';

test('préchargement : tout se charge', async () => {
  assert.equal(await preloadAll([1, 2], async () => 'ok', 500), 'loaded');
  assert.equal(await preloadAll([], async () => 'ok', 500), 'loaded');
});

test('préchargement : une image qui échoue ou un chargeur qui lève ne bloque rien', async () => {
  assert.equal(await preloadAll([1, 2], async (n) => (n === 2 ? Promise.reject(new Error('404')) : 'ok'), 500), 'partial');
  const throwsNow = () => {
    throw new TypeError('Image.default.resolveAssetSource is not a function');
  };
  assert.equal(await preloadAll([1], throwsNow, 500), 'partial');
});

test('préchargement : un module Image sans resolveAssetSource (web) ne casse pas le démarrage', async () => {
  // Comme react-native-web : Image sans resolveAssetSource
  const WebImage: { resolveAssetSource?: (s: number) => { uri: string } } = {};
  const oldLoader = (source: number) => {
    const uri = WebImage.resolveAssetSource!(source).uri;
    return Promise.resolve(uri);
  };
  assert.equal(await preloadAll([1, 2], oldLoader, 500), 'partial');
});

test('préchargement : un chargement qui n’aboutit jamais est abandonné au bout du délai', async () => {
  const started = Date.now();
  assert.equal(await preloadAll([1], () => new Promise(() => {}), 50), 'timeout');
  assert.ok(Date.now() - started < 1000);
});

test('le hook de préchargement n’utilise plus Image.resolveAssetSource (absent sur le web)', () => {
  const source = readFileSync(new URL('../src/hooks/usePreloadedImages.ts', import.meta.url), 'utf8');
  assert.ok(!source.includes('resolveAssetSource('));
  assert.ok(source.includes('Asset.fromModule'));
  assert.ok(source.includes('runSafely'));
});
