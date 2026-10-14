import { type AudioPlayer, type AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

import { soundSettings } from '@/src/state/soundSettings';
import { createSoundBank, type VoicePlayer } from './soundBank';
import {
  type AnySoundName,
  SOUND_NAMES,
  type SoundName,
  soundAllowed,
  soundSteps,
  soundVoices,
  soundVolume,
} from './soundRules';

export type { AnySoundName, SoundName };

// Sons de l'app (assets/sounds, AAC .m4a : iOS, Android et web). Lus avec
// expo-audio :
// - sur iPhone, le bouton silencieux est respecté (aucun son en mode
//   silencieux) et la musique de la personne n'est jamais coupée : les sons
//   s'y mélangent ;
// - réglage « Sons » du profil respecté (state/soundSettings.ts) ;
// - sur le web, rien n'est tenté avant une première interaction ;
// - un son qui ne se charge pas ou ne se joue pas : rien ne plante, rien ne
//   s'affiche.
// Lecteurs préchargés et rembobinés d'avance (utils/soundBank.ts) ; volumes
// dans soundRules.ts (SOUND_LEVEL).
const SOURCES: Record<SoundName, number> = {
  tick: require('@/assets/sounds/tick.m4a'),
  select: require('@/assets/sounds/select.m4a'),
  pickup: require('@/assets/sounds/pickup.m4a'),
  drop: require('@/assets/sounds/drop.m4a'),
  correct: require('@/assets/sounds/correct.m4a'),
  wrong: require('@/assets/sounds/wrong.m4a'),
  match: require('@/assets/sounds/match.m4a'),
  mismatch: require('@/assets/sounds/mismatch.m4a'),
  advance: require('@/assets/sounds/advance.m4a'),
  swipe: require('@/assets/sounds/swipe.m4a'),
  reveal: require('@/assets/sounds/reveal.m4a'),
  unlock: require('@/assets/sounds/unlock.m4a'),
  'message-in': require('@/assets/sounds/message-in.m4a'),
  'message-out': require('@/assets/sounds/message-out.m4a'),
  'chest-step': require('@/assets/sounds/chest-step.m4a'),
  coins: require('@/assets/sounds/coins.m4a'),
  'lesson-complete': require('@/assets/sounds/lesson-complete.m4a'),
  'module-complete': require('@/assets/sounds/module-complete.m4a'),
  streak: require('@/assets/sounds/streak.m4a'),
  'chest-open': require('@/assets/sounds/chest-open.m4a'),
  combo: require('@/assets/sounds/combo.m4a'),
  freeze: require('@/assets/sounds/freeze.m4a'),
};

const web = Platform.OS === 'web';
let modeReady = false;
// Web : la page a-t-elle déjà reçu un toucher, un clic ou une touche ?
let interacted = !web;

// En développement, un échec est noté une fois dans la console ; jamais à l'écran
let noted = false;
function note(err: unknown): void {
  if (!__DEV__ || noted) return;
  noted = true;
  console.log('Son indisponible (expo-audio) :', err instanceof Error ? err.message : String(err));
}

if (web && typeof window !== 'undefined') {
  const unlock = () => {
    interacted = true;
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

function prepareMode(): void {
  if (modeReady) return;
  modeReady = true;
  try {
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(note);
  } catch (err) {
    note(err);
  }
}

type Listenable = {
  addListener(event: 'playbackStatusUpdate', listener: (status: AudioStatus) => void): unknown;
};

// Un lecteur expo-audio vu par la banque
function voiceFor(name: SoundName): VoicePlayer {
  // Session audio gardée active entre deux sons (iPhone) : sans cela, elle
  // se coupe 100 ms après chaque son et chaque lecture doit la relancer
  const player: AudioPlayer = createAudioPlayer(SOURCES[name], { keepAudioSessionActive: true });
  player.shouldCorrectPitch = false;
  return {
    play: () => player.play(),
    pause: () => player.pause(),
    // Web : le retour au début est immédiat ; ailleurs, il faut l'attendre
    rewind: () => {
      const done = player.seekTo(0);
      if (!web) return done;
      done.catch(note);
    },
    setVolume: (volume) => {
      player.volume = volume;
    },
    setRate: (rate) => player.setPlaybackRate(rate),
    onFinish: (listener) => {
      // Les types d'expo-modules-core (écouteurs) ne sont pas vus depuis
      // expo-audio dans ce projet : on décrit la méthode ici
      const events = player as unknown as Listenable;
      events.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) listener();
      });
    },
  };
}

const bank = createSoundBank<SoundName>({
  create: voiceFor,
  voices: soundVoices,
  now: () => Date.now(),
  onError: note,
});

// Préchargement à l'ouverture du lecteur, de la cérémonie de fin et des
// écrans qui jouent un son : aucun décalage au premier son. Sur le web, les
// fichiers se chargent quand même (sans rien jouer avant une interaction).
export function preloadSounds(): void {
  try {
    soundSettings.load().catch(note);
    prepareMode();
    SOUND_NAMES.forEach((name) => bank.preload(name));
  } catch (err) {
    note(err);
  }
}

export type SoundOptions = {
  // Vitesse de lecture, sans correction de hauteur (le son monte avec elle)
  rate?: number;
  // Adoucissement par rapport au niveau du son (SOUND_LEVEL), 1 par défaut
  gain?: number;
  // Écart minimal entre deux départs de ce son (ms)
  minGap?: number;
  // Un seul lecteur audible à la fois pour ce son
  exclusive?: boolean;
};

// Joue un son depuis le début, tout de suite, à chaque appel. Un son prévu
// mais pas encore livré (medal) joue son remplaçant (soundRules.ts).
export function playSound(name: AnySoundName, { rate = 1, gain = 1, minGap = 0, exclusive = false }: SoundOptions = {}): void {
  try {
    if (!soundAllowed(soundSettings.isEnabled(), web, interacted)) return;
    prepareMode();
    for (const step of soundSteps(name)) {
      const go = () => {
        bank.play(step.name, { rate, volume: soundVolume(step.name, gain), minGap, exclusive });
      };
      if (step.at > 0) setTimeout(go, step.at);
      else go();
    }
  } catch (err) {
    note(err);
  }
}
