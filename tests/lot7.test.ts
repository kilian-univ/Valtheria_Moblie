/// <reference types="node" />
// Lancer : npm test
// Lot 7 (retours du premier test sur iPhone) : cadence du simulateur,
// curseurs au lecteur d'écran, grand texte, chargement du patrimoine.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { createTrailingThrottle } from '../src/utils/frameBatch';
import { readPortfolio } from '../src/utils/patrimoine/model';
import { isNetworkError, loadErrorKind } from '../src/utils/loadError';
import { remainingDelay, withNetworkRetry } from '../src/utils/retry';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

// Horloge et minuteries simulées
function fakeClock() {
  let now = 0;
  let timers: { at: number; run: () => void; id: number }[] = [];
  let next = 1;
  return {
    now: () => now,
    later: (run: () => void, ms: number) => {
      const id = next++;
      timers.push({ at: now + ms, run, id });
      return id;
    },
    cancel: (id: unknown) => {
      timers = timers.filter((t) => t.id !== id);
    },
    advance(ms: number) {
      now += ms;
      const due = timers.filter((t) => t.at <= now);
      timers = timers.filter((t) => t.at > now);
      due.forEach((t) => t.run());
    },
  };
}

test('cadence limitée : la première tout de suite, puis au plus une toutes les 33 ms, la dernière jamais perdue', () => {
  const clock = fakeClock();
  const sent: number[] = [];
  const t = createTrailingThrottle<number>((v) => sent.push(v), 33, clock.now, clock.later, clock.cancel);
  t.push(1);
  assert.deepEqual(sent, [1]);
  // Rafale pendant l'attente : seule la dernière part, à la fin de l'attente
  clock.advance(5);
  t.push(2);
  clock.advance(5);
  t.push(3);
  assert.deepEqual(sent, [1]);
  clock.advance(23);
  assert.deepEqual(sent, [1, 3]);
  // Au lâcher : flush() envoie tout de suite la valeur en attente
  clock.advance(1);
  t.push(4);
  t.flush();
  assert.deepEqual(sent, [1, 3, 4]);
  // cancel() oublie la valeur en attente
  t.push(5);
  t.cancel();
  clock.advance(100);
  assert.deepEqual(sent, [1, 3, 4]);
  // Au calme, une valeur part tout de suite
  t.push(6);
  assert.deepEqual(sent, [1, 3, 4, 6]);
});

test('erreurs : le délai dépassé de l’API n’est plus « pas de connexion internet »', () => {
  assert.equal(isNetworkError(new TypeError('Network request failed')), true);
  assert.equal(loadErrorKind(new TypeError('Network request failed')), 'network');
  // Délai de 15 s de la couche API : le serveur ne répond pas
  assert.equal(isNetworkError(new TypeError('Network request timed out')), false);
  assert.equal(loadErrorKind(new TypeError('Network request timed out')), 'server');
  assert.equal(loadErrorKind(new Error('Erreur API')), 'server');
  assert.equal(loadErrorKind(new Error('Load failed')), 'network');
});

test('patrimoine : une réponse illisible est une erreur du serveur, jamais une coupure du réseau', () => {
  // Une lecture qui lève une TypeError passait pour « pas de connexion internet »
  const hostile = new Proxy(
    {},
    {
      get() {
        throw new TypeError('undefined is not an object');
      },
    }
  );
  assert.throws(
    () => readPortfolio(hostile),
    (e: unknown) => e instanceof Error && !(e instanceof TypeError) && loadErrorKind(e) === 'server'
  );
});

test('seconde tentative : une fois après un échec du réseau, jamais après une erreur du serveur', async () => {
  const pause = () => Promise.resolve();
  let calls = 0;
  const flaky = () => (++calls === 1 ? Promise.reject(new TypeError('Network request failed')) : Promise.resolve('ok'));
  assert.equal(await withNetworkRetry(flaky, 800, pause), 'ok');
  assert.equal(calls, 2);

  calls = 0;
  const server = () => {
    calls++;
    return Promise.reject(new Error('Erreur API'));
  };
  await assert.rejects(withNetworkRetry(server, 800, pause), /Erreur API/);
  assert.equal(calls, 1);

  calls = 0;
  const down = () => {
    calls++;
    return Promise.reject(new TypeError('Network request failed'));
  };
  await assert.rejects(withNetworkRetry(down, 800, pause), /Network request failed/);
  assert.equal(calls, 2);
});

test('« Nouvelle tentative… » reste affiché au moins 700 ms', () => {
  assert.equal(remainingDelay(1000, 1100), 600);
  assert.equal(remainingDelay(1000, 1700), 0);
  assert.equal(remainingDelay(1000, 2500), 0);
});

test('patrimoine : « Réessayer » garde l’erreur affichée, le bouton dit « Nouvelle tentative… »', () => {
  const data = read('src/state/patrimoineData.ts');
  assert.ok(data.includes("const retrying = state.status === 'error' && !state.portfolio;"));
  assert.ok(data.includes('if (retrying) set({ retrying: true });'));
  assert.ok(data.includes('withNetworkRetry(fetchPortfolio)'));
  const view = read('src/hooks/usePatrimoineView.ts');
  assert.ok(view.includes('retrying = data.retrying;') && view.includes('retrying = session.profileRetrying;'));
  const page = read('src/components/common/PageState.tsx');
  assert.ok(page.includes("props.retrying ? 'Nouvelle tentative…'"));
  for (const screen of ['PatrimoineGate', 'AnalyseScreen', 'ActifScreen']) {
    assert.ok(read(`src/screens/patrimoine/${screen}.tsx`).includes('retrying={v.retrying}'), screen);
  }
});

test('curseurs : ajustables au lecteur d’écran, valeur annoncée avec son unité, validation au double toucher', () => {
  const slider = read('src/components/apprendre/player/TrackSlider.tsx');
  assert.ok(slider.includes("accessibilityRole={readOnly ? undefined : 'adjustable'}"));
  assert.ok(slider.includes('announce(formatValue(next));'));
  assert.ok(slider.includes("{ name: 'activate', label: 'Valider' }"));
  assert.ok(slider.includes('onAccessibilityTap={interactive ? validate : undefined}'));
  // Tous les écrans à curseur donnent le texte d'une valeur, pas un texte figé
  for (const screen of ['SliderScreen', 'SimulatorScreen', 'AllocateScreen']) {
    const src = read(`src/components/apprendre/screens/${screen}.tsx`);
    assert.ok(src.includes('formatValue='), screen);
  }
  // Le curseur ne prend plus de texte figé, lu tant que l'écran n'a pas suivi
  assert.ok(!slider.includes('valueText'));
  // Les valeurs à boutons + et − (date, rappel) sont réglables aussi
  for (const file of ['src/components/patrimoine/DateField.tsx', 'src/components/onboarding/ReminderPicker.tsx']) {
    assert.ok(read(file).includes('<AdjustableValue'), file);
  }
  const adjustable = read('src/components/common/AdjustableValue.tsx');
  assert.ok(adjustable.includes('accessibilityRole="adjustable"') && adjustable.includes('announce(valueText);'));
});

test('grand texte : libellés de l’ancien en-tête plafonnés, bulle d’accueil gardée dans le décor, cartes du vrai ou faux qui grandissent', () => {
  // Ancien en-tête : libellés plafonnés (un plafond par défaut du Text de base
  // écraserait celui, plus bas, des textes qui l'englobent)
  assert.equal((read('src/components/topbar/header.tsx').match(/maxFontSizeMultiplier=\{1\.3\}/g) ?? []).length, 2);
  const scene = read('src/components/onboarding/VaultScene.tsx');
  assert.ok(scene.includes('maxFontScale={BUBBLE_MAX_FONT_SCALE}') && scene.includes('bubbleTop = mouth.y - anchor - lift;'));
  const tf = read('src/components/apprendre/screens/TrueFalseScreen.tsx');
  assert.ok(tf.includes('const cardHeight = Math.round(CARD_HEIGHT * Math.min(Math.max(fontScale, 1), STATEMENT_MAX_SCALE));'));
});
