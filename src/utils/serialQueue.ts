// File d'attente : les tâches s'exécutent l'une après l'autre, dans l'ordre
// d'appel, même si l'une échoue. Évite qu'une lecture-modification-écriture
// en écrase une autre (deux favoris touchés vite : l'un se perdait).
// Fonction pure, testable avec Node.
export function serialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function inOrder<T>(job: () => Promise<T>): Promise<T> {
    const run = tail.then(job, job);
    tail = run.catch(() => {});
    return run;
  };
}
