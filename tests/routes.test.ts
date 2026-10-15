/// <reference types="node" />
// Lancer : npm test
// Démarrage en production : route d'entrée, page introuvable, outils de
// développement absents d'une version publiée

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

test('« / » a sa route : l’accueil d’Apprendre', () => {
  assert.ok(existsSync(new URL('app/index.tsx', root)));
  assert.match(read('app/index.tsx'), /<Redirect href="\/apprendre" \/>/);
});

test('page introuvable propre à l’app, plan du site d’Expo Router coupé', () => {
  const notFound = read('app/+not-found.tsx');
  assert.ok(notFound.includes('Cette page n’existe pas'));
  assert.ok(notFound.includes("router.replace('/apprendre')"));
  const config = JSON.parse(read('app.json'));
  const router = config.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-router');
  assert.ok(router, 'plugin expo-router avec options');
  assert.equal(router[1].sitemap, false);
});

test('diagnostic des curseurs : développement seulement', () => {
  const flags = read('src/state/devFlags.ts');
  // Version publiée : tout reste à false, set ne fait rien
  assert.ok(flags.includes('get: (): DevFlags => (__DEV__ ? flags : OFF)'));
  assert.ok(flags.includes('if (!__DEV__) return;'));
  // Interrupteurs affichés seulement dans le bloc __DEV__ de la connexion
  const login = read('src/screens/header/LoginScreen.tsx');
  const devBlock = login.slice(login.indexOf('{__DEV__ ? ('));
  assert.ok(devBlock.includes('{DevSliderSwitches ? <DevSliderSwitches /> : null}'));
  // Module chargé sous __DEV__ seulement : retiré des versions publiées
  assert.ok(login.includes('const DevSliderSwitches: ComponentType | null = __DEV__'));
  assert.ok(login.includes("require('@/src/components/dev/DevSliderSwitches').default"));
  assert.ok(!login.includes("import DevSliderSwitches"));
  // Branchés sur les vibrations, les sons et le curseur
  assert.ok(read('src/utils/haptics.ts').includes('if (devFlags.get().noHaptics) return;'));
  assert.ok(read('src/utils/sound.ts').includes('if (devFlags.get().noSounds) return;'));
  const slider = read('src/components/apprendre/player/TrackSlider.tsx');
  assert.ok(slider.includes('if (jsDragging && devFlags.get().noLiveUpdates) return;'));
  // Au lâcher, l'écran reçoit toujours la valeur finale
  assert.match(slider, /onChange\(final\);\s*onCommit\?\.\(final\);/);
});
