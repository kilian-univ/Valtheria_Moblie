/// <reference types="node" />
// Lancer : npm test
// Styles animés : sur le téléphone, ils tournent sur le fil de l'interface, où
// appeler une fonction qui n'est pas un worklet ferme l'app (sur le web, rien
// ne se voit : tout tourne sur le fil JavaScript)

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

function sources(dir: string): string[] {
  return readdirSync(new URL(dir, root)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(new URL(path, root)).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = [...sources('src'), ...sources('app')].map((path) => ({ path, text: readFileSync(new URL(path, root), 'utf8') }));

// Fonctions de Reanimated utilisables dans un worklet
const REANIMATED = ['withTiming', 'withSpring', 'withSequence', 'withDelay', 'withRepeat', 'withDecay', 'interpolate', 'interpolateColor', 'clamp'];

// Fonctions de l'app marquées « worklet »
const WORKLETS = files.flatMap(({ text }) =>
  [...text.matchAll(/(?:function\s+(\w+)\s*\([^)]*\)[^{]*|(?:const|let)\s+(\w+)\s*=\s*\([^)]*\)[^{=]*=>\s*)\{\s*'worklet'/g)].map((m) => m[1] ?? m[2])
);

// Corps de chaque useAnimatedStyle, useAnimatedProps et useDerivedValue
function animatedBodies(text: string): { line: number; body: string }[] {
  return [...text.matchAll(/use(?:AnimatedStyle|AnimatedProps|DerivedValue)\(/g)].map((m) => {
    let depth = 1;
    let end = m.index + m[0].length;
    while (depth > 0 && end < text.length) {
      if (text[end] === '(') depth += 1;
      if (text[end] === ')') depth -= 1;
      end += 1;
    }
    return { line: text.slice(0, m.index).split('\n').length, body: text.slice(m.index + m[0].length, end) };
  });
}

test('styles animés : seulement des fonctions worklet', () => {
  const allowed = new Set([...REANIMATED, ...WORKLETS, 'String', 'Number', 'Boolean', 'if', 'for', 'while', 'switch', 'return', 'typeof']);
  const faults = files.flatMap(({ path, text }) =>
    animatedBodies(text).flatMap(({ line, body }) =>
      // Appels directs (les méthodes, comme Math.min ou glow.get, ne comptent pas)
      [...body.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*\(/g)]
        .map((m) => m[1])
        .filter((name) => !allowed.has(name))
        .map((name) => `${path}:${line} appelle ${name}()`)
    )
  );
  assert.deepEqual(faults, []);
});

test('le contrôle repère bien un appel interdit', () => {
  const [found] = animatedBodies('const s = useAnimatedStyle(() => ({ backgroundColor: withOpacity(c, 0.1 * v.get()) }));');
  assert.match(found.body, /withOpacity\(/);
});
