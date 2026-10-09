// Chargeur des tests Node (npm test) : Node exécute le TypeScript tel quel,
// mais ne connaît ni l'alias « @/ » ni les imports sans extension de l'app.
// On résout les deux ici. Seuls les modules purs (sans React Native) sont
// testables ainsi ; leurs imports de types disparaissent à l'exécution.
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

registerHooks({
  resolve(specifier, context, nextResolve) {
    const local = specifier.startsWith('@/')
      ? new URL(specifier.slice(2), root).href
      : specifier.startsWith('.') && context.parentURL
        ? new URL(specifier, context.parentURL).href
        : null;
    if (local && !existsSync(fileURLToPath(local))) {
      const found = EXTENSIONS.map((ext) => local + ext).find((url) => existsSync(fileURLToPath(url)));
      if (found) return nextResolve(found, context);
    }
    return nextResolve(local ?? specifier, context);
  },
});
