/// <reference types="node" />
// Lancer : npm test
// Animations et gestes : sur le téléphone, ce code tourne sur le fil de
// l'interface, où appeler une fonction qui n'est pas un worklet ferme l'app
// (sur le web, rien ne se voit). Le contrôle lit l'arbre syntaxique de
// TypeScript : voir tests/workletCheck.ts pour ce qui est lu et permis.

import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { analyzeWorklets, readSources, type Source } from './workletCheck';

const root = fileURLToPath(new URL('../', import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(root, dir, name);
    if (statSync(path).isDirectory()) return sources(relative(root, path));
    return /\.tsx?$/.test(name) ? [relative(root, path)] : [];
  });
}

test('animations et gestes de l’app : seulement des worklets', () => {
  const files = readSources(root, [...sources('src'), ...sources('app')]);
  assert.deepEqual(analyzeWorklets(files, root), []);
});

// Petits fichiers d'essai : chaque angle mort de l'ancien contrôle (audit du
// 17/10/2026, T1 à T9) doit être repéré, sans aucun faux signalement
const VIRTUAL = '/virtuel';
const run = (files: Record<string, string>) =>
  analyzeWorklets(
    Object.entries(files).map(([path, text]): Source => ({ path, text })),
    VIRTUAL
  );

const HELPERS = {
  'src/helpers.ts': `
    export function formatAmount(v: number) { return String(v); }
    export const follow = (x: number) => { 'worklet'; return x * 2; };
    export function timing(v: number) { 'worklet'; return v; }
    export const feedback = { tick() {} };
  `,
};

const CASES: Record<string, string> = {
  'T1 méthode d’un objet de l’app': `
    import { useAnimatedStyle } from 'react-native-reanimated';
    function C({ theme, v }: any) { return useAnimatedStyle(() => ({ color: theme.withOpacity('#000', v.get()) })); }`,
  'T2 useAnimatedReaction': `
    import { useAnimatedReaction } from 'react-native-reanimated';
    import { feedback } from './helpers';
    function C({ x }: any) { useAnimatedReaction(() => x.get(), (v) => feedback.tick()); }`,
  'T3 rappel de geste': `
    import { Gesture } from 'react-native-gesture-handler';
    import { formatAmount } from './helpers';
    const g = Gesture.Pan().onEnd(() => { formatAmount(3); });`,
  'T4 rappel de withTiming': `
    import { withTiming } from 'react-native-reanimated';
    function C({ setDone }: any) { const run = () => { v.set(withTiming(0, {}, () => setDone(true))); }; }`,
  'T5 intérieur d’une fonction worklet': `
    import { formatAmount } from './helpers';
    export const move = (x: number) => { 'worklet'; return formatAmount(x); };`,
  'T6 nom de worklet pris dans un autre fichier': `
    import { useAnimatedStyle } from 'react-native-reanimated';
    function timing(v: number) { return v; }
    function C({ v }: any) { return useAnimatedStyle(() => ({ opacity: timing(v.get()) })); }`,
  'T7 fonction passée en argument': `
    import { useAnimatedStyle } from 'react-native-reanimated';
    import { formatAmount } from './helpers';
    function C({ list }: any) { return useAnimatedStyle(() => ({ width: list.map(formatAmount).length })); }`,
  'T8 hook qui reçoit une fonction nommée': `
    import { useAnimatedStyle } from 'react-native-reanimated';
    import { formatAmount } from './helpers';
    function C({ v }: any) { const build = () => ({ width: formatAmount(v.get()) }); return useAnimatedStyle(build); }`,
  'T9 parenthèse dans une chaîne ou un commentaire': `
    import { useAnimatedStyle } from 'react-native-reanimated';
    import { formatAmount } from './helpers';
    function C({ v }: any) { return useAnimatedStyle(() => { const label = ')'; /* ) */ return { width: formatAmount(v.get()) }; }); }`,
  'useAnimatedScrollHandler (objet de rappels)': `
    import { useAnimatedScrollHandler } from 'react-native-reanimated';
    import { formatAmount } from './helpers';
    function C() { return useAnimatedScrollHandler({ onScroll: (e) => { formatAmount(e.contentOffset.y); } }); }`,
  'fonction du composant appelée directement': `
    import { useAnimatedStyle } from 'react-native-reanimated';
    function C({ onDone, v }: any) { return useAnimatedStyle(() => { if (v.get() > 1) onDone(); return {}; }); }`,
  'fonction passée à un enveloppeur de geste (safeGesture)': `
    import { Gesture } from 'react-native-gesture-handler';
    import { formatAmount } from './helpers';
    function wrap(fn: () => void) { return () => { 'worklet'; fn(); }; }
    const g = Gesture.Pan().onEnd(wrap(() => { formatAmount(1); }));`,
  'module externe (vibrations)': `
    import { Gesture } from 'react-native-gesture-handler';
    import * as Haptics from 'expo-haptics';
    const g = Gesture.Tap().onStart(() => { Haptics.selectionAsync(); });`,
};

for (const [name, code] of Object.entries(CASES)) {
  test(`le contrôle repère : ${name}`, () => {
    const faults = run({ ...HELPERS, 'src/cas.tsx': code });
    assert.ok(faults.length > 0, 'au moins un signalement');
    assert.ok(faults.every((f) => f.startsWith('src/cas.tsx:')), faults.join('\n'));
  });
}

test('aucun faux signalement sur les écritures permises', () => {
  const faults = run({
    ...HELPERS,
    'src/ok.tsx': `
      import { Gesture } from 'react-native-gesture-handler';
      import { interpolate, useAnimatedReaction, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
      import { scheduleOnRN } from 'react-native-worklets';
      import { follow, timing, formatAmount } from './helpers';
      const clampLocal = (x: number) => { 'worklet'; return Math.min(1, Math.max(0, x)); };
      function C({ v, setOpen, list }: any) {
        const s = useAnimatedStyle(() => {
          const half = (x: number) => x / 2;
          return { opacity: clampLocal(half(v.get())), width: follow(timing(interpolate(v.get(), [0, 1], [0, 10]))), height: list.map((x: number) => x + 1).reduce((a: number, b: number) => a + b, 0) };
        });
        useAnimatedReaction(() => v.get(), (now) => { if (now > 1) scheduleOnRN(setOpen, true); });
        const g = Gesture.Pan().onUpdate((e) => { v.set(withSpring(e.translationX)); }).onEnd(() => { v.set(withTiming(0, { easing: Easing.out(Easing.cubic) }, (done) => { if (done) scheduleOnRN(setOpen, false); })); });
        const js = Gesture.Tap().runOnJS(true).onEnd(() => { formatAmount(1); setOpen(true); });
        const label = formatAmount(3);
        return [s, g, js, label];
      }`,
  });
  assert.deepEqual(faults, []);
});
