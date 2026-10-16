/// <reference types="node" />
// Lancer : npm test
// Sons de l'app : règles (utils/soundRules.ts) et fichiers (assets/sounds)

import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

import { createSoundBank, type VoicePlayer } from '../src/utils/soundBank';
import {
  chestStepRate,
  comboReached,
  EVENT_SOUNDS,
  FUTURE_SOUNDS,
  parseSoundSetting,
  reminderSound,
  SOUND_LEVEL,
  SOUND_LENGTH,
  SOUND_LEVELS,
  SOFT_GAIN,
  SOUND_NAMES,
  soundAllowed,
  soundForEvent,
  soundSteps,
  soundVoices,
  soundVolume,
  BURST_MIN_GAP,
  chestStepRate as chestRate,
  SOUND_VARIANTS,
  TICK_BLOCKED_RATE,
  TICK_COUNT_RATE,
} from '../src/utils/soundRules';
import { RUN_MIN } from '../src/utils/lessonPlayer';

const root = new URL('../', import.meta.url);

test('chaque événement a son son', () => {
  const expected: Record<string, string> = {
    tick: 'tick',
    pick: 'select',
    pickup: 'pickup',
    drop: 'drop',
    right: 'correct',
    wrong: 'wrong',
    match: 'match',
    mismatch: 'mismatch',
    advance: 'advance',
    swipe: 'swipe',
    reveal: 'reveal',
    messageIn: 'message-in',
    messageOut: 'message-out',
    combo: 'combo',
    lessonComplete: 'lesson-complete',
    moduleComplete: 'module-complete',
    streakUp: 'streak',
    freeze: 'freeze',
    chestStep: 'chest-step',
    chestOpen: 'chest-open',
    coins: 'coins',
    unlock: 'unlock',
    medal: 'medal',
  };
  assert.deepEqual(EVENT_SOUNDS, expected);
  for (const [event, name] of Object.entries(expected)) assert.equal(soundForEvent(event as keyof typeof EVENT_SOUNDS), name);
  // Les vingt-deux sons servent tous
  const used = new Set<string>(Object.values(EVENT_SOUNDS));
  for (const name of SOUND_NAMES) assert.ok(used.has(name), `son inutilisé : ${name}`);
});

test('medal et notification : prévus, remplacés en attendant', () => {
  assert.deepEqual([...FUTURE_SOUNDS], ['medal', 'notification']);
  // Nouvelle médaille : unlock, puis combo
  const medal = soundSteps('medal');
  assert.deepEqual(medal.map((s) => s.name), ['unlock', 'combo']);
  assert.equal(medal[0].at, 0);
  assert.ok(medal[1].at > 0);
  // Un son livré joue lui-même
  assert.deepEqual(soundSteps('correct'), [{ name: 'correct', at: 0 }]);
  // Rappel quotidien : son système tant que le fichier n'est pas livré
  assert.equal(reminderSound(), 'default');
  assert.equal(reminderSound('notification.wav'), 'notification.wav');
});

test('volumes : un seul tableau, trois niveaux bien séparés', () => {
  assert.ok(SOUND_LEVELS.micro < SOUND_LEVELS.medium && SOUND_LEVELS.medium < SOUND_LEVELS.big);
  assert.ok(SOUND_LEVELS.micro <= SOUND_LEVELS.medium / 2, 'micro-sons nettement plus bas');
  for (const name of ['tick', 'select', 'pickup', 'drop'] as const) assert.equal(SOUND_LEVEL[name], 'micro');
  for (const name of ['correct', 'wrong', 'match', 'mismatch', 'advance', 'swipe', 'reveal', 'unlock', 'message-in', 'message-out'] as const) {
    assert.equal(SOUND_LEVEL[name], 'medium', name);
  }
  for (const name of ['lesson-complete', 'module-complete', 'streak', 'chest-open', 'combo', 'freeze'] as const) {
    assert.equal(SOUND_LEVEL[name], 'big', name);
  }
  // Chaque son a son niveau ; un son adouci reste dans 0..1
  for (const name of SOUND_NAMES) assert.ok(soundVolume(name) > 0 && soundVolume(name) <= 1);
  assert.ok(soundVolume('swipe', 0.45) < soundVolume('swipe'));
  assert.equal(soundVolume('combo', 5), 1);
  // Aucun volume codé en dur ailleurs
  const player = readFileSync(new URL('src/utils/sound.ts', root), 'utf8');
  assert.ok(!/volume\s*[:=]\s*0\.\d/.test(player));
});

test('lecteurs : plusieurs pour les sons qui se chevauchent', () => {
  for (const name of ['tick', 'select', 'correct', 'match'] as const) assert.ok(soundVoices(name) >= 2, name);
  assert.equal(soundVoices('lesson-complete'), 1);
});

test('hauteurs fixes préparées d’avance : butée plus grave, chiffres plus aigus, paliers du coffre', () => {
  assert.ok(TICK_BLOCKED_RATE < 1 && TICK_COUNT_RATE > 1);
  const has = (name: string, rate = 1, gain = 1) =>
    SOUND_VARIANTS.some((v) => v.name === name && (v.rate ?? 1) === rate && (v.gain ?? 1) === gain);
  assert.ok(has('tick', TICK_BLOCKED_RATE));
  assert.ok(has('tick', TICK_COUNT_RATE));
  for (const step of [1, 2, 3]) assert.ok(has('chest-step', chestRate(step)), `palier ${step}`);
  for (const name of ['swipe', 'mismatch', 'advance', 'streak', 'correct', 'wrong']) assert.ok(has(name, 1, SOFT_GAIN), name);
});

test('un fichier .m4a pour chaque son, chargé par le lecteur', () => {
  const player = readFileSync(new URL('src/utils/sound.ts', root), 'utf8');
  for (const name of SOUND_NAMES) {
    const file = new URL(`assets/sounds/${name}.m4a`, root);
    assert.ok(existsSync(file), `fichier absent : ${name}.m4a`);
    assert.ok(statSync(file).size > 1000, `fichier vide : ${name}.m4a`);
    assert.ok(player.includes(`assets/sounds/${name}.m4a`), `non chargé : ${name}`);
  }
});

test('coffre : chaque palier un peu plus aigu', () => {
  assert.equal(chestStepRate(0), 1);
  const rates = [0, 1, 2, 3].map(chestStepRate);
  for (let i = 1; i < rates.length; i++) assert.ok(rates[i] > rates[i - 1]);
  // Deux demi-tons par palier
  assert.ok(Math.abs(chestStepRate(1) - Math.pow(2, 2 / 12)) < 1e-9);
  assert.ok(Math.abs(chestStepRate(3) - Math.pow(2, 6 / 12)) < 1e-9);
  // Jamais au-delà du double, jamais en dessous de 1
  assert.ok(chestStepRate(50) <= 2);
  assert.equal(chestStepRate(-2), 1);
  assert.equal(chestStepRate(Number.NaN), 1);
});

test('combo : à l’apparition de la pastille (3), puis à chaque nouveau palier', () => {
  assert.equal(RUN_MIN, 3);
  assert.equal(comboReached(1, 2, RUN_MIN), false);
  assert.equal(comboReached(2, 3, RUN_MIN), true);
  assert.equal(comboReached(3, 4, RUN_MIN), true);
  // Série cassée, ou inchangée : rien
  assert.equal(comboReached(4, 0, RUN_MIN), false);
  assert.equal(comboReached(4, 4, RUN_MIN), false);
});

test('réglage Sons : activé par défaut, coupé seulement sur demande', () => {
  assert.equal(parseSoundSetting(null), true);
  assert.equal(parseSoundSetting(undefined), true);
  assert.equal(parseSoundSetting('on'), true);
  assert.equal(parseSoundSetting('n’importe quoi'), true);
  assert.equal(parseSoundSetting('off'), false);
  // Coupé : aucun son, nulle part
  assert.equal(soundAllowed(false, false, true), false);
  assert.equal(soundAllowed(false, true, true), false);
  assert.equal(soundAllowed(true, false, false), true);
  // Web : rien avant une première interaction
  assert.equal(soundAllowed(true, true, false), false);
  assert.equal(soundAllowed(true, true, true), true);
});

test('curseur : vibration à chaque cran, aucun son pendant le glissement, un tick au lâcher', () => {
  const haptics = readFileSync(new URL('src/utils/haptics.ts', root), 'utf8');
  assert.ok(!haptics.includes('playSound'), 'les vibrations ne jouent pas de son');
  const slider = readFileSync(new URL('src/components/apprendre/player/TrackSlider.tsx', root), 'utf8');
  const fb = readFileSync(new URL('src/utils/feedback.ts', root), 'utf8');
  // Pendant le glissement : la vibration seule (une toutes les 40 ms au plus)
  assert.match(fb, /sliderStep\(\) \{\s*if \(tickHaptic\(\)\) haptics\.select\(\);\s*\}/);
  assert.match(fb, /createThrottle\(SELECT_MIN_GAP/);
  assert.match(slider, /const stepped = \(next: number\) => \{\s*feedback\.sliderStep\(\);/);
  // Au lâcher : un seul tick
  assert.match(slider, /const settle = \(final: number\) => \{[^}]*feedback\.sliderRelease\(\);/);
  assert.match(fb, /sliderRelease\(\) \{\s*playSound\('tick', \{ minGap: BURST_MIN_GAP \}\);/);
  // Butée : tick grave, une fois par glissement (remis à zéro au début seulement)
  assert.ok(slider.includes('feedback.tickBlocked()'));
  assert.ok(slider.includes('if (wanted > ceiling && !blocked.get()) {'));
  assert.ok(!slider.includes('blocked.set(false);\n    }'));
});

test('rafales : jamais plus d’un son toutes les 150 ms', () => {
  assert.equal(BURST_MIN_GAP, 150);
  const fb = readFileSync(new URL('src/utils/feedback.ts', root), 'utf8');
  assert.match(fb, /playSound\('tick', \{ rate: TICK_COUNT_RATE, minGap: COUNT_TICK_MIN_GAP \}\)/);
  assert.match(fb, /playSound\('chest-step', \{ rate: chestStepRate\(step\), minGap: BURST_MIN_GAP \}\)/);
  assert.match(fb, /playSound\('tick', \{ rate: TICK_BLOCKED_RATE, minGap: BURST_MIN_GAP \}\)/);
});

test('session audio configurée une seule fois, au démarrage', () => {
  const sound = readFileSync(new URL('src/utils/sound.ts', root), 'utf8');
  assert.equal(sound.split('setAudioModeAsync(').length, 2, 'un seul appel');
  assert.ok(sound.includes('if (modeReady) return;'));
  assert.ok(readFileSync(new URL('app/_layout.tsx', root), 'utf8').includes('configureSoundSession();'));
});

// ---------------------------------------------------------------------------
// Banque de lecteurs : chaque événement joue son son, à chaque fois, tout de suite
// ---------------------------------------------------------------------------

// Lecteur factice qui se comporte comme celui de l'iPhone : le retour au
// début est asynchrone ; lancé sans être revenu au début, un son fini ne
// joue rien (c'était la cause des sons manquants)
type Fake = VoicePlayer & {
  name: string;
  position: 'start' | 'end' | 'middle';
  playing: boolean;
  starts: number;
  heard: number;
  volume: number;
  rate: number;
  settings: number;
  finish(): void;
};

function makeBank({ sync = false } = {}) {
  let clock = 0;
  const fakes: Fake[] = [];
  const pendingRewinds: (() => void)[] = [];
  const bank = createSoundBank<string>({
    voices: (name) => (name === 'tick' ? 4 : name === 'correct' ? 2 : 1),
    now: () => clock,
    onError: (err) => {
      throw err;
    },
    create: (name) => {
      let onFinish = () => {};
      const fake: Fake = {
        name,
        position: 'start',
        playing: false,
        starts: 0,
        heard: 0,
        volume: 1,
        rate: 1,
        settings: 0,
        play() {
          fake.starts++;
          if (fake.position === 'end') return; // à la fin : silence
          fake.playing = true;
          fake.position = 'middle';
          fake.heard++;
        },
        pause() {
          fake.playing = false;
        },
        rewind() {
          if (sync) {
            fake.position = 'start';
            return;
          }
          return new Promise<void>((resolve) => {
            pendingRewinds.push(() => {
              fake.position = 'start';
              resolve();
            });
          });
        },
        setVolume(v) {
          fake.volume = v;
          fake.settings++;
        },
        setRate(r) {
          fake.rate = r;
          fake.settings++;
        },
        onFinish(listener) {
          onFinish = listener;
        },
        finish() {
          fake.playing = false;
          fake.position = 'end';
          onFinish();
        },
      };
      fakes.push(fake);
      return fake;
    },
  });
  const flush = async () => {
    while (pendingRewinds.length) pendingRewinds.shift()!();
    await new Promise((r) => setImmediate(r));
  };
  return { bank, fakes, flush, tick: (ms: number) => (clock += ms) };
}

const heard = (fakes: Fake[], name: string) => fakes.filter((f) => f.name === name).reduce((n, f) => n + f.heard, 0);

test('banque : un son préchargé part tout de suite, sans attendre', () => {
  const { bank, fakes } = makeBank();
  bank.preload('wrong', { volume: 0.7 });
  assert.equal(fakes.length, 1);
  assert.equal(bank.play('wrong', { volume: 0.7 }), true);
  // Même variante : le lecteur préchargé, aucun nouveau
  assert.equal(fakes.length, 1);
  // Entendu dans le même appel : rien n'est attendu avant la lecture
  assert.equal(heard(fakes, 'wrong'), 1);
  assert.equal(fakes[0].volume, 0.7);
});

test('banque : un son fini est rembobiné d’avance et rejoue à chaque fois', async () => {
  const { bank, fakes, flush } = makeBank();
  for (let i = 1; i <= 5; i++) {
    bank.play('wrong');
    fakes[0].finish();
    await flush();
    assert.equal(heard(fakes, 'wrong'), i);
  }
});

test('banque : rejoué alors qu’il joue encore (ou vient de finir), il repart du début', async () => {
  const { bank, fakes, flush } = makeBank();
  bank.play('wrong');
  // Second départ avant la fin : le lecteur repart du début dès qu'il y est
  bank.play('wrong');
  await flush();
  assert.equal(heard(fakes, 'wrong'), 2);
  // Fin signalée, puis départ immédiat avant que le retour au début n'aboutisse :
  // jamais de lecture depuis la fin, le son part quand même
  fakes[0].finish();
  bank.play('wrong');
  await flush();
  assert.equal(heard(fakes, 'wrong'), 3);
  assert.equal(fakes[0].starts, fakes[0].heard, 'aucun départ dans le vide');
});

test('banque : sons qui se chevauchent sur plusieurs lecteurs', () => {
  const { bank, fakes } = makeBank();
  bank.play('correct');
  bank.play('correct');
  assert.equal(heard(fakes, 'correct'), 2);
  // Deux lecteurs distincts, tous deux en cours
  assert.equal(fakes.filter((f) => f.name === 'correct' && f.playing).length, 2);
});

test('banque : rafale limitée à un son toutes les 150 ms', () => {
  const { bank, fakes, tick } = makeBank({ sync: true });
  let played = 0;
  // Chiffres qui défilent : une valeur toutes les 16 ms pendant 750 ms
  for (let t = 0; t <= 750; t += 16) {
    if (bank.play('tick', { minGap: BURST_MIN_GAP, rate: TICK_COUNT_RATE })) played++;
    tick(16);
  }
  assert.ok(played >= 5 && played <= 6, String(played));
  assert.equal(heard(fakes, 'tick'), played);
});

test('banque : hauteur et volume réglés à la création, jamais au moment de jouer', () => {
  const { bank, fakes, tick } = makeBank({ sync: true });
  bank.preload('tick', { rate: TICK_COUNT_RATE, volume: 0.3 });
  bank.preload('tick', { volume: 0.3 });
  const before = fakes.reduce((n, f) => n + f.settings, 0);
  for (let i = 0; i < 12; i++) {
    bank.play('tick', { rate: i % 2 ? TICK_COUNT_RATE : 1, volume: 0.3 });
    tick(200);
  }
  assert.equal(fakes.reduce((n, f) => n + f.settings, 0), before, 'aucun réglage pendant les lectures');
  // Chaque variante a ses propres lecteurs, à sa hauteur
  assert.ok(fakes.some((f) => f.rate === TICK_COUNT_RATE) && fakes.some((f) => f.rate === 1));
  assert.equal(heard(fakes, 'tick'), 12);
});

test('banque : un lecteur indisponible ne plante rien', () => {
  const bank = createSoundBank<string>({ create: () => null, voices: () => 2, now: () => 0, onError: () => {} });
  assert.equal(bank.play('wrong'), false);
  const broken = createSoundBank<string>({
    create: () => {
      throw new Error('module absent');
    },
    voices: () => 1,
    now: () => 0,
    onError: () => {},
  });
  assert.equal(broken.play('wrong'), false);
});

test('chaque événement joue son son, au moment du geste', () => {
  const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
  const fb = read('src/utils/feedback.ts');
  // Un appel de feedback = un playSound, sans condition ni attente
  const calls: [string, string][] = [
    ['pickup', "playSound('pickup')"],
    ['drop', "playSound('drop')"],
    ['match', "playSound('match')"],
    ['mismatch', "playSound('mismatch')"],
    ['advance', "playSound('advance')"],
    ['reveal', "playSound('reveal')"],
    ['messageIn', "playSound('message-in')"],
    ['messageOut', "playSound('message-out')"],
    ['moduleComplete', "playSound('module-complete')"],
    ['freeze', "playSound('freeze')"],
  ];
  for (const [event, call] of calls) assert.match(fb, new RegExp(`${event}\\([^)]*\\) \\{[^}]*${call.replace(/[()]/g, '\\$&')}`), event);
  assert.ok(fb.includes("playSound('medal')"));
  assert.ok(!fb.includes('await'));
  // Branchements
  assert.ok(read('src/components/apprendre/screens/OrderScreen.tsx').includes('feedback.pickup()'));
  assert.ok(read('src/components/apprendre/screens/OrderScreen.tsx').includes('feedback.drop()'));
  const match = read('src/components/apprendre/screens/MatchScreen.tsx');
  assert.ok(match.includes('feedback.match()') && match.includes('feedback.mismatch()'));
  assert.ok(!match.includes('feedback.right()') && !match.includes('feedback.wrong()'));
  const dialogue = read('src/components/apprendre/screens/DialogueScreen.tsx');
  assert.ok(dialogue.includes('feedback.messageIn()') && dialogue.includes('feedback.messageOut()'));
  assert.ok(read('src/components/apprendre/screens/RevealScreen.tsx').includes('feedback.reveal()'));
  assert.ok(read('src/components/apprendre/end/LessonEndFlow.tsx').includes('feedback.moduleComplete()'));
  assert.ok(read('src/components/common/MedalCelebration.tsx').includes('feedback.medal('));
  assert.ok(read('src/components/apprendre/home/GuestStreakCard.tsx').includes('feedback.freeze'));
  assert.ok(read('src/components/apprendre/home/StreakSheet.tsx').includes('feedback.freeze()'));
  assert.ok(read('src/components/apprendre/module/path/ModulePath.tsx').includes('feedback.refuse()'));
  assert.ok(read('src/screens/dictionary/TermScreen.tsx').includes('feedback.pick()'));
  assert.ok(read('src/components/apprendre/end/LessonRecap.tsx').includes('useCountTicks(counted, 0, !fast && ticks)'));
  const tf = read('src/components/apprendre/screens/TrueFalseScreen.tsx');
  assert.ok(tf.includes('feedback.cardIn()'));
  // Vrai ou faux : verdict au geste (decide), pas après le vol de la carte
  assert.ok(tf.includes('scheduleOnRN(decide, toRight)'));
  const player = read('src/screens/ApprendreDetailScreen.tsx');
  // Valider : verdict au toucher ; écran sans verdict : advance
  assert.ok(player.includes('if (!draft.autoSubmit) signal();'));
  assert.ok(player.includes('feedback.advance();'));
  // Session audio gardée active, lecteurs préchargés
  const sound = read('src/utils/sound.ts');
  assert.ok(sound.includes('keepAudioSessionActive: true'));
  assert.ok(!/seekTo\(0\)[^\n]*\n\s*player\.play\(\)/.test(sound), 'plus de lecture lancée avant le retour au début');
});

test('réglage Sons : même mémoire au profil, dans « Quitter la leçon ? » et à la connexion', () => {
  const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
  assert.ok(read('src/components/common/SoundSettingRow.tsx').includes('useSoundToggle'));
  assert.ok(read('src/components/apprendre/player/QuitSheet.tsx').includes('<SoundToggle'));
  assert.ok(read('src/screens/header/LoginScreen.tsx').includes('<SoundToggle'));
  // Une seule mémoire : soundSettings ; un cran au changement, un son seulement à la réactivation
  const toggle = read('src/components/common/SoundToggle.tsx');
  assert.ok(toggle.includes('soundSettings.set(next)'));
  assert.match(toggle, /select\(\);\s*soundSettings\.set\(next\);\s*if \(next\) playSound\('select'\);/);
});

// Durée d'un fichier .m4a, lue dans son en-tête (boîte mvhd), sans les
// 2 112 échantillons d'amorce de l'encodeur AAC
function m4aSeconds(name: string): number {
  const buf = readFileSync(new URL(`assets/sounds/${name}.m4a`, root));
  const i = buf.indexOf('mvhd');
  const v1 = buf[i + 4] === 1;
  const scale = buf.readUInt32BE(i + (v1 ? 24 : 16));
  const length = v1 ? Number(buf.readBigUInt64BE(i + 28)) : buf.readUInt32BE(i + 20);
  return (length - 2112) / scale;
}

test('durées attendues : celles des fichiers', () => {
  const close = (ms: number, s: number) => Math.abs(ms / 1000 - s) < 0.06;
  assert.ok(close(SOUND_LENGTH['lesson-complete'], m4aSeconds('lesson-complete')));
  assert.ok(close(SOUND_LENGTH.streak, m4aSeconds('streak')));
  // Médaille (remplaçant) : combo part à 300 ms et dure jusqu'à la fin annoncée
  const last = soundSteps('medal').at(-1)!;
  assert.ok(close(SOUND_LENGTH.medal - last.at, m4aSeconds(last.name)));
});

test('ajustements validés de l’audit', () => {
  const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
  assert.equal(SOFT_GAIN, 0.45);
  // 1. Feuille finale adoucie pour le vrai ou faux et associer
  const player = read('src/screens/ApprendreDetailScreen.tsx');
  assert.ok(player.includes("current.kind === 'true_false' || current.kind === 'match' ? SOFT_GAIN : 1"));
  // (la bonne réponse prend aussi la hauteur de la série d'affilée)
  assert.ok(player.includes('feedback.right(gain, ') && player.includes('feedback.wrong(gain)'));
  // 2. Bilan : les chiffres comptent après lesson-complete
  // Les chiffres défilent dès leur apparition ; seuls les ticks attendent
  const recap = read('src/components/apprendre/end/LessonRecap.tsx');
  assert.ok(recap.includes('delay={(TILES_RANK + i) * motion.stagger + motion.sheet}'));
  assert.ok(recap.includes("setTimeout(() => setTicksOn(true), SOUND_LENGTH['lesson-complete'])"));
  assert.ok(recap.includes('useCountTicks(counted, 0, !fast && ticks)'));
  // 3. Allumage de la flamme : streak très doux, une fois
  const flame = read('src/components/common/StreakFlame.tsx');
  assert.ok(flame.includes('feedback.ignite()') && flame.includes('ignited.current = true'));
  assert.match(read('src/utils/feedback.ts'), /ignite\(\) \{\s*playSound\('streak', \{ gain: SOFT_GAIN \}\)/);
  // Le gel de la carte attend la fin de l'allumage
  assert.ok(read('src/components/apprendre/home/GuestStreakCard.tsx').includes('SOUND_LENGTH.streak'));
  // 4. Leçon ouverte depuis le chemin ou la grande carte : advance doux
  assert.match(read('src/utils/feedback.ts'), /openLesson\(\) \{\s*playSound\('advance', \{ gain: SOFT_GAIN \}\)/);
  assert.ok(read('src/components/apprendre/module/path/ModulePath.tsx').includes('feedback.openLesson()'));
  assert.ok(read('src/components/apprendre/home/GuestHome.tsx').includes('feedback.openLesson()'));
  assert.ok(read('src/screens/apprendre/ApprendreHomeScreen.tsx').includes('feedback.openLesson()'));
  // 5. Écran « Série » : un tick aigu par jour qui défile
  assert.ok(read('src/components/apprendre/end/LessonEndFlow.tsx').includes('useCountTicks(shown, from)'));
  assert.ok(read('src/screens/onboarding/DiscoveryEndScreen.tsx').includes('useCountTicks(shownStreak, streakFrom)'));
  // 6. Médaille et gel gagné : freeze après la médaille
  assert.ok(read('src/components/common/MedalCelebration.tsx').includes('feedback.medal({ freeze: freezeGained })'));
  assert.match(read('src/utils/feedback.ts'), /setTimeout\(\(\) => feedback\.freeze\(\), SOUND_LENGTH\.medal\)/);
});
