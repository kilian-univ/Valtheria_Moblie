import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

import { soundSettings } from '@/src/state/soundSettings';
import { SOUND_NAMES, type SoundName, soundAllowed } from './soundRules';

export type { SoundName };

// Sons de l'app (assets/sounds, AAC .m4a : iOS, Android et web). Lus avec
// expo-audio :
// - sur iPhone, le bouton silencieux est respecté (aucun son en mode
//   silencieux) et la musique de la personne n'est jamais coupée : les sons
//   s'y mélangent, à volume réduit ;
// - réglage « Sons » du profil respecté (state/soundSettings.ts) ;
// - sur le web, rien n'est tenté avant une première interaction ;
// - un son qui ne se charge pas ou ne se joue pas : rien ne plante, rien ne
//   s'affiche.
const SOURCES: Record<SoundName, number> = {
  select: require('@/assets/sounds/select.m4a'),
  correct: require('@/assets/sounds/correct.m4a'),
  wrong: require('@/assets/sounds/wrong.m4a'),
  swipe: require('@/assets/sounds/swipe.m4a'),
  combo: require('@/assets/sounds/combo.m4a'),
  'lesson-complete': require('@/assets/sounds/lesson-complete.m4a'),
  streak: require('@/assets/sounds/streak.m4a'),
  'chest-step': require('@/assets/sounds/chest-step.m4a'),
  'chest-open': require('@/assets/sounds/chest-open.m4a'),
  coins: require('@/assets/sounds/coins.m4a'),
  unlock: require('@/assets/sounds/unlock.m4a'),
};

// Par-dessus la musique, à volume réduit
const VOLUME = 0.8;

const web = Platform.OS === 'web';
const players: Partial<Record<SoundName, AudioPlayer>> = {};
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

function playerFor(name: SoundName): AudioPlayer | null {
  const existing = players[name];
  if (existing) return existing;
  try {
    const player = createAudioPlayer(SOURCES[name]);
    player.volume = VOLUME;
    players[name] = player;
    return player;
  } catch (err) {
    note(err);
    return null;
  }
}

// Préchargement à l'ouverture du lecteur et de la cérémonie de fin : aucun
// décalage au premier son. Sur le web, les fichiers se chargent quand même
// (sans rien jouer avant une interaction).
export function preloadSounds(): void {
  try {
    soundSettings.load().catch(note);
    prepareMode();
    SOUND_NAMES.forEach((name) => playerFor(name));
  } catch (err) {
    note(err);
  }
}

// Joue un son depuis le début. rate : vitesse de lecture, sans correction
// de hauteur (le son monte avec elle : paliers du coffre).
export function playSound(name: SoundName, { rate = 1 }: { rate?: number } = {}): void {
  try {
    if (!soundAllowed(soundSettings.isEnabled(), web, interacted)) return;
    prepareMode();
    const player = playerFor(name);
    if (!player) return;
    if (player.playbackRate !== rate) {
      player.shouldCorrectPitch = false;
      player.setPlaybackRate(rate);
    }
    player.seekTo(0).catch(note);
    player.play();
  } catch (err) {
    note(err);
  }
}
