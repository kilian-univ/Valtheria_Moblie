// Contrôle du compilateur React : chaque composant et chaque hook de `src/`
// et `app/` doit être compilé (mémorisé) par le compilateur React. Quand il
// saute un composant, il le fait en silence : rien ne le signale à l'écran
// ni dans ESLint, et l'écran entier se redessine à chaque rendu. Ce script
// passe chaque fichier dans Babel avec le préréglage d'Expo, exactement comme
// Metro, et lit le journal du compilateur.
//
//   node scripts/compilateur.mjs            tout `src/` et `app/`
//   node scripts/compilateur.mjs <fichiers> seulement ceux-là
//
// Sort avec le code 1 si un composant est sauté sans figurer dans TOLERES.
// Les composants marqués « 'use no memo' » (opt-out volontaire) sont listés
// mais acceptés.
import { readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

const root = fileURLToPath(new URL('../', import.meta.url));

// Fichiers sautés en connaissance de cause, avec la raison : à vider dès que
// possible.
const TOLERES = {
  // Zone protégée (CLAUDE.md) : correctif prêt, à appliquer par Kilian ou avec
  // l'accord explicite de l'utilisateur. Deux `try` sans `catch` et un
  // `finally` dans ApiProvider.
  'src/context/ApiContext.tsx': 'zone protégée : correctif en attente',
};

function listSources(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...listSources(path));
      continue;
    }
    if (!/\.tsx?$/.test(name) || name.endsWith('.d.ts')) continue;
    out.push(path);
  }
  return out;
}

function compile(file) {
  const events = [];
  const logger = { logEvent: (_filename, event) => events.push(event) };
  babel.transformFileSync(file, {
    cwd: root,
    root,
    filename: file,
    babelrc: false,
    configFile: false,
    sourceType: 'unambiguous',
    // Le même appelant que Metro pour le web en développement : le
    // compilateur React est branché par le préréglage d'Expo
    caller: { name: 'metro', platform: 'web', isDev: true, bundler: 'metro', supportsStaticESM: false, supportsReactCompiler: true },
    presets: [['babel-preset-expo', { 'react-compiler': { logger, panicThreshold: 'none' } }]],
  });
  return events;
}

function describe(event) {
  const d = event.detail ?? event;
  const loc = d.loc ?? d.options?.loc ?? event.fnLoc;
  const line = loc?.start ? ` (ligne ${loc.start.line})` : '';
  const reason = d.reason ?? d.options?.reason ?? d.message ?? event.kind;
  return `${line} ${String(reason).replace(/\s+/g, ' ').slice(0, 220)}`;
}

const asked = process.argv.slice(2);
const files = asked.length > 0 ? asked.map((f) => join(root, f)) : [...listSources(join(root, 'src')), ...listSources(join(root, 'app'))];

let compiled = 0;
const skipped = [];
const optedOut = [];
const tolerated = [];
for (const file of files.sort()) {
  const rel = relative(root, file);
  let events;
  try {
    events = compile(file);
  } catch (e) {
    skipped.push(`${rel} : Babel a échoué : ${String(e.message).split('\n')[0]}`);
    continue;
  }
  for (const event of events) {
    if (event.kind === 'CompileSuccess') {
      compiled += 1;
    } else if (event.kind === 'CompileSkip') {
      optedOut.push(`${rel}${describe(event)}`);
    } else if (event.kind === 'CompileError') {
      (TOLERES[rel] ? tolerated : skipped).push(`${rel}${describe(event)}`);
    }
  }
}

console.log(`Compilateur React : ${compiled} composant(s) et hook(s) compilés dans ${files.length} fichier(s).`);
if (optedOut.length > 0) console.log(`\nOpt-out volontaires ('use no memo') :\n  ${optedOut.join('\n  ')}`);
if (tolerated.length > 0) console.log(`\nSautés mais tolérés (voir TOLERES) :\n  ${tolerated.join('\n  ')}`);
if (skipped.length > 0) {
  console.log(`\nSAUTÉS par le compilateur React (à corriger) :\n  ${skipped.join('\n  ')}`);
  console.log('\nPistes : un « finally », une condition (? :, &&, ?.) dans un try, une règle react-hooks désactivée, un ??=, une expression logique en valeur par défaut d’un paramètre. Voir le README, « Conventions du code ».');
  process.exit(1);
}
console.log('Aucun composant sauté.');
