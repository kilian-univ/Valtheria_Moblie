// Banque de lecteurs des sons, sans React ni module natif : testable avec
// Node (le vrai lecteur, expo-audio, est branché dans utils/sound.ts).
//
// Chaque son a un ou plusieurs lecteurs, chargés d'avance et rembobinés
// dès qu'ils ont fini : jouer, c'est lancer un lecteur prêt, tout de suite,
// sans rien attendre. Si aucun n'est prêt (le son vient d'être joué), on
// relance le plus ancien depuis le début : le son part à chaque fois.

export type VoicePlayer = {
  play(): void;
  pause(): void;
  // Retour au début : immédiat (web) ou promesse (iPhone, Android, où la
  // lecture doit attendre la fin du retour pour ne pas partir de la fin)
  rewind(): Promise<void> | void;
  setVolume(volume: number): void;
  setRate(rate: number): void;
  // Fin de lecture signalée par le lecteur
  onFinish(listener: () => void): void;
};

export type PlayOptions = {
  // Vitesse, sans correction de hauteur : le son monte avec elle
  rate?: number;
  volume?: number;
  // Écart minimal entre deux départs de ce son (ms) : en deçà, rien
  minGap?: number;
};

// Variante d'un son : sa hauteur (vitesse) et son volume, réglés une seule
// fois à la création de ses lecteurs, jamais au moment de jouer (chaque
// réglage est un appel au natif)
export type SoundVariant = { rate?: number; volume?: number };

type Voice = {
  player: VoicePlayer;
  // ready : au début, prêt à partir ; playing : en cours (ou fini sans
  // signal) ; rewinding : retour au début en cours
  state: 'ready' | 'playing' | 'rewinding';
  startedAt: number;
  // Change à chaque départ : un retour au début devenu inutile ne relance rien
  token: number;
};

export type SoundBank<N extends string> = {
  preload(name: N, variant?: SoundVariant): void;
  // Le son part-il ? (false : écart minimal, ou lecteur indisponible)
  play(name: N, options?: PlayOptions): boolean;
};

function isPromise(value: unknown): value is Promise<void> {
  return typeof (value as Promise<void> | undefined)?.then === 'function';
}

export function createSoundBank<N extends string>({
  create,
  voices,
  now,
  onError,
}: {
  create: (name: N) => VoicePlayer | null;
  voices: (name: N) => number;
  now: () => number;
  onError: (err: unknown) => void;
}): SoundBank<N> {
  // Lecteurs par variante (nom, hauteur, volume)
  const pools = new Map<string, Voice[]>();
  const lastAt = new Map<N, number>();

  const rewind = (voice: Voice, then: () => void) => {
    const token = voice.token;
    voice.state = 'rewinding';
    const done = () => {
      if (voice.token === token) then();
    };
    try {
      const result = voice.player.rewind();
      if (isPromise(result)) result.then(done, onError);
      else done();
    } catch (err) {
      onError(err);
    }
  };

  const pool = (name: N, rate: number, volume: number): Voice[] => {
    const key = `${name}|${rate}|${volume}`;
    const existing = pools.get(key);
    if (existing) return existing;
    const list: Voice[] = [];
    for (let i = 0; i < Math.max(1, voices(name)); i++) {
      try {
        const player = create(name);
        if (!player) break;
        // Hauteur et volume de la variante, une fois pour toutes
        player.setVolume(volume);
        if (rate !== 1) player.setRate(rate);
        const voice: Voice = { player, state: 'ready', startedAt: -Infinity, token: 0 };
        // Fini : on rembobine aussitôt, le lecteur sera prêt au prochain coup
        player.onFinish(() => {
          if (voice.state !== 'playing') return;
          voice.token++;
          rewind(voice, () => {
            voice.state = 'ready';
          });
        });
        list.push(voice);
      } catch (err) {
        onError(err);
        break;
      }
    }
    pools.set(key, list);
    return list;
  };

  // Départ : un seul appel au natif, play()
  const start = (voice: Voice) => {
    voice.token++;
    voice.player.play();
    voice.state = 'playing';
    voice.startedAt = now();
  };

  return {
    preload(name, { rate = 1, volume = 1 } = {}) {
      pool(name, rate, volume);
    },
    play(name, { rate = 1, volume = 1, minGap = 0 } = {}) {
      try {
        const t = now();
        const last = lastAt.get(name);
        if (minGap > 0 && last !== undefined && t - last < minGap) return false;
        const list = pool(name, rate, volume);
        if (list.length === 0) return false;
        lastAt.set(name, t);
        const ready = list.find((v) => v.state === 'ready');
        if (ready) {
          start(ready);
          return true;
        }
        // Aucun prêt : le plus ancien repart du début (pause, retour, lecture)
        const oldest = list.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
        oldest.token++;
        oldest.player.pause();
        rewind(oldest, () => start(oldest));
        return true;
      } catch (err) {
        onError(err);
        return false;
      }
    },
  };
}
