import { localDay } from '@/src/utils/day';
import type { Declic } from '@/src/utils/notebook';
import {
  parseServerRevision,
  pickDeclicExtras,
  type PlanItem,
  seededRandom,
  type ServerRevision,
} from '@/src/utils/revision';
import { updateRevisionMemory, type RevisionMemory } from './revisionMemory';
import type { UserKey } from './userMemory';

// Révision du serveur d'un compte : demandée à GET /api/revision, gardée sur
// le téléphone pour la journée (la même session tant qu'elle n'a pas
// expiré), avec les déclics du carnet ajoutés. Une seule demande à la fois.
// Échec (hors ligne, route absente, erreur, réponse inattendue) : rejet, et
// l'app retombe sur sa propre révision.

const running = new Map<UserKey, Promise<ServerRevision>>();

function yesterdayOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

// Déclics joués la veille (révision du serveur ou de l'app)
function yesterdayKeys(memory: RevisionMemory, today: string): string[] {
  const day = yesterdayOf(today);
  const fromServer = memory.servers.find((r) => r.day === day)?.extras ?? [];
  const fromApp = memory.plans.find((p) => p.day === day)?.items ?? [];
  return [...fromServer, ...fromApp].map((i: PlanItem) => i.key);
}

export function fetchServerRevision(
  get: (path: string) => Promise<unknown>,
  user: UserKey,
  memory: RevisionMemory,
  declics: readonly Declic[]
): Promise<ServerRevision> {
  const current = running.get(user);
  if (current) return current;
  const job = (async () => {
    const parsed = parseServerRevision(await get('/revision'));
    if (!parsed) throw new Error('Réponse de révision inattendue');
    const now = new Date();
    const today = localDay(now);
    const record: ServerRevision = {
      day: today,
      fetchedAt: now.toISOString(),
      session: parsed.session,
      empty: parsed.empty,
      extras: pickDeclicExtras({
        declics,
        history: memory.history,
        yesterdayKeys: yesterdayKeys(memory, today),
        random: seededRandom(`${user}|${today}|declics`),
      }),
      done: null,
    };
    await updateRevisionMemory(user, (m) => ({ ...m, servers: [...m.servers.filter((r) => r.day !== today), record] }));
    return record;
  })().finally(() => running.delete(user));
  running.set(user, job);
  return job;
}
