// Contrôle des worklets par l'arbre syntaxique de TypeScript (utilisé par
// tests/worklets.test.ts). Sur le téléphone, le code d'une animation tourne
// sur le fil de l'interface : y appeler une fonction ordinaire ferme l'app
// (sur le web, rien ne se voit, tout tourne sur le fil JavaScript). C'est ce
// qui a fermé le portefeuille sur iPhone le 16/10/2026.
//
// Code lu comme un worklet :
// - les fonctions passées à useAnimatedStyle, useAnimatedProps,
//   useDerivedValue, useAnimatedReaction (les deux), useFrameCallback,
//   useAnimatedScrollHandler et useAnimatedGestureHandler ;
// - les rappels des gestes (Gesture.*().onStart, onUpdate…), sauf une chaîne
//   en .runOnJS(true) ;
// - les rappels de fin de withTiming, withSpring, withDecay, withRepeat et
//   les .withCallback des animations d'entrée et de sortie ;
// - le corps de toute fonction marquée 'worklet'.
// Une fonction nommée à ces endroits est retrouvée et lue.
//
// Dans ce code, un appel n'est permis que vers : une fonction définie dans
// le worklet lui-même, une fonction marquée 'worklet' (du fichier, ou
// importée : l'import est suivi jusqu'à sa déclaration), Reanimated et
// Worklets, quelques fonctions globales, les méthodes de Math, Number…,
// les méthodes des valeurs partagées (get, set, modify) et celles des
// tableaux, chaînes et nombres. Une fonction ordinaire passée en argument
// (arr.map(helper)) est aussi refusée, sauf à scheduleOnRN et runOnJS.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

export type Source = { path: string; text: string };

const HOOKS: Record<string, number[]> = {
  useAnimatedStyle: [0],
  useAnimatedProps: [0],
  useDerivedValue: [0],
  useAnimatedReaction: [0, 1],
  useFrameCallback: [0],
  useAnimatedScrollHandler: [0],
  useAnimatedGestureHandler: [0],
};
// Rappel de fin, par position de l'argument
const END_CALLBACKS: Record<string, number> = { withTiming: 2, withSpring: 2, withDecay: 1, withRepeat: 3 };
const GESTURE_CALLBACKS = /^(onBegin|onStart|onUpdate|onChange|onEnd|onFinalize|onTouchesDown|onTouchesMove|onTouchesUp|onTouchesCancelled)$/;
const WORKLET_PACKAGES = new Set(['react-native-reanimated', 'react-native-worklets']);
const GLOBAL_FUNCTIONS = new Set(['String', 'Number', 'Boolean', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Array']);
const GLOBAL_OBJECTS = new Set(['Math', 'Number', 'String', 'Object', 'Array', 'JSON', 'Date', 'Easing', 'console']);
const SHARED_VALUE_METHODS = new Set(['get', 'set', 'modify']);
const BUILTIN_METHODS = new Set([
  'map', 'filter', 'reduce', 'slice', 'concat', 'join', 'includes', 'indexOf', 'lastIndexOf', 'push', 'pop', 'shift',
  'unshift', 'some', 'every', 'find', 'findIndex', 'forEach', 'fill', 'reverse', 'sort', 'splice', 'flat',
  'toFixed', 'toString', 'toPrecision', 'padStart', 'padEnd', 'replace', 'split', 'trim', 'startsWith', 'endsWith',
  'charAt', 'charCodeAt', 'substring', 'toUpperCase', 'toLowerCase', 'repeat', 'at', 'keys', 'values', 'entries',
]);
// Fonctions JavaScript qu'un worklet peut confier au fil JavaScript
const HAND_OFF = new Set(['scheduleOnRN', 'runOnJS', 'runOnUI', 'scheduleOnUI']);

type Parsed = { path: string; sf: ts.SourceFile };

function parse(src: Source): Parsed {
  const kind = src.path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return { path: src.path, sf: ts.createSourceFile(src.path, src.text, ts.ScriptTarget.Latest, true, kind) };
}

type Fn = ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration;
const isFn = (n: ts.Node | undefined): n is Fn => !!n && (ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n));

export function isWorkletFn(fn: Fn): boolean {
  const body = fn.body;
  if (!body || !ts.isBlock(body)) return false;
  const first = body.statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'worklet';
}

// Déclarations d'un fichier : nom → fonction (ou autre valeur), imports
type Binding = { kind: 'fn'; fn: Fn } | { kind: 'value' } | { kind: 'import'; from: string; name: string };

function bindings(p: Parsed): Map<string, Binding> {
  const map = new Map<string, Binding>();
  const visit = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name) map.set(n.name.text, { kind: 'fn', fn: n });
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) {
      const init = n.initializer;
      map.set(n.name.text, isFn(init) ? { kind: 'fn', fn: init } : { kind: 'value' });
    } else if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.importClause) {
      const from = n.moduleSpecifier.text;
      const clause = n.importClause;
      if (clause.name) map.set(clause.name.text, { kind: 'import', from, name: 'default' });
      const named = clause.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const el of named.elements) map.set(el.name.text, { kind: 'import', from, name: (el.propertyName ?? el.name).text });
      } else if (named && ts.isNamespaceImport(named)) map.set(named.name.text, { kind: 'import', from, name: '*' });
    } else if (ts.isParameter(n) && ts.isIdentifier(n.name)) {
      if (!map.has(n.name.text)) map.set(n.name.text, { kind: 'value' });
    }
    ts.forEachChild(n, visit);
  };
  visit(p.sf);
  return map;
}

export function analyzeWorklets(sources: Source[], rootDir: string): string[] {
  const parsed = new Map(sources.map((s) => [s.path, parse(s)]));
  const binds = new Map([...parsed].map(([path, p]) => [path, bindings(p)]));

  // Chemin d'un import de l'app (« @/src/… » ou relatif), sinon null
  const resolveImport = (from: string, fromFile: string): string | null => {
    const base = from.startsWith('@/') ? join(rootDir, from.slice(2)) : from.startsWith('.') ? resolve(dirname(join(rootDir, fromFile)), from) : null;
    if (!base) return null;
    for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
      const full = base + ext;
      const rel = relative(rootDir, full);
      if (parsed.has(rel)) return rel;
      if (existsSync(full) && statSync(full).isFile()) return rel;
    }
    return null;
  };

  // Ce qu'un nom désigne vraiment : une fonction worklet, une autre fonction,
  // Reanimated, ou autre chose. Les imports sont suivis jusqu'à leur source.
  type Kind = 'worklet' | 'reanimated' | { fn: Fn; file: string } | 'other' | 'unknown';
  const kindOf = (name: string, file: string, depth = 0): Kind => {
    const b = binds.get(file)?.get(name);
    if (!b) return 'unknown';
    if (b.kind === 'fn') return isWorkletFn(b.fn) ? 'worklet' : { fn: b.fn, file };
    if (b.kind === 'value') return 'other';
    if (WORKLET_PACKAGES.has(b.from)) return 'reanimated';
    const target = resolveImport(b.from, file);
    if (!target || !binds.has(target) || depth > 5) return 'other';
    if (b.name === 'default') {
      const def = parsed.get(target)!.sf.statements.find((s) => ts.isFunctionDeclaration(s) && s.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword));
      return def && isFn(def) ? (isWorkletFn(def) ? 'worklet' : { fn: def, file: target }) : 'other';
    }
    return b.name === '*' ? 'other' : kindOf(b.name, target, depth + 1);
  };

  const faults: string[] = [];
  const seen = new Set<ts.Node>();
  // Paramètres d'une fonction appelés par le worklet qu'elle renvoie
  // (safeGesture(fn, recover)) : ce que l'appelant y passe doit être un
  // worklet, et sera lu comme tel
  const workletParams = new Map<Fn, Set<number>>();
  const outerParam = (from: ts.Node, name: string): { fn: Fn; index: number } | null => {
    for (let n: ts.Node | undefined = from.parent; n; n = n.parent) {
      if (isFn(n)) {
        const index = n.parameters.findIndex((prm) => ts.isIdentifier(prm.name) && prm.name.text === name);
        if (index >= 0) return { fn: n, index };
      }
    }
    return null;
  };
  const where = (file: string, node: ts.Node) => `${file}:${parsed.get(file)!.sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;

  // Noms définis dans le worklet lui-même (paramètres, constantes, fonctions)
  const localNames = (root: ts.Node): Set<string> => {
    const names = new Set<string>();
    const visit = (n: ts.Node) => {
      if ((ts.isParameter(n) || ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isBindingElement(n)) && n.name && ts.isIdentifier(n.name)) names.add(n.name.text);
      ts.forEachChild(n, visit);
    };
    visit(root);
    return names;
  };

  // Lit un worklet : fonction, nom de fonction, ou objet de rappels
  const checkWorklet = (node: ts.Node, file: string, what: string) => {
    if (ts.isIdentifier(node)) {
      const k = kindOf(node.text, file);
      if (typeof k === 'object') checkWorklet(k.fn, k.file, what);
      return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) checkWorklet(prop.initializer, file, what);
        else if (ts.isMethodDeclaration(prop)) checkBody(prop, file, what);
      }
      return;
    }
    if (isFn(node)) checkBody(node, file, what);
  };

  const checkBody = (fn: ts.Node, file: string, what: string) => {
    if (seen.has(fn)) return;
    seen.add(fn);
    const locals = localNames(fn);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression;
        let handOff = false;
        if (ts.isIdentifier(callee)) {
          const name = callee.text;
          handOff = HAND_OFF.has(name);
          const outer = locals.has(name) ? null : outerParam(fn, name);
          if (outer) {
            const set = workletParams.get(outer.fn) ?? new Set<number>();
            set.add(outer.index);
            workletParams.set(outer.fn, set);
          } else if (!locals.has(name) && !GLOBAL_FUNCTIONS.has(name) && !HAND_OFF.has(name)) {
            const k = kindOf(name, file);
            if (k !== 'worklet' && k !== 'reanimated') faults.push(`${where(file, n)} ${what} appelle ${name}(), qui n’est pas un worklet`);
          }
        } else if (ts.isPropertyAccessExpression(callee) || ts.isPropertyAccessChain(callee)) {
          const method = callee.name.text;
          const obj = callee.expression;
          const allowedObject = ts.isIdentifier(obj) && (GLOBAL_OBJECTS.has(obj.text) || (!locals.has(obj.text) && kindOf(obj.text, file) === 'reanimated'));
          if (!allowedObject && !SHARED_VALUE_METHODS.has(method) && !BUILTIN_METHODS.has(method)) {
            faults.push(`${where(file, n)} ${what} appelle la méthode ${callee.getText().replace(/\s+/g, '')}(), qui n’est pas un worklet`);
          }
        }
        // Fonction ordinaire passée en argument (sauf au fil JavaScript)
        n.arguments.forEach((arg, i) => {
          if (!ts.isIdentifier(arg) || locals.has(arg.text) || (handOff && i === 0)) return;
          const k = kindOf(arg.text, file);
          if (typeof k === 'object') faults.push(`${where(file, arg)} ${what} passe ${arg.text}, qui n’est pas un worklet`);
        });
      }
      ts.forEachChild(n, visit);
    };
    visit(fn);
  };

  // Rappel de geste sur une chaîne Gesture.*(), et la chaîne passe-t-elle
  // par .runOnJS(true) (rappels sur le fil JavaScript) ?
  const gestureChain = (call: ts.CallExpression): { gesture: boolean; onJs: boolean } => {
    let top: ts.Node = call;
    while (top.parent && (ts.isPropertyAccessExpression(top.parent) || (ts.isCallExpression(top.parent) && top.parent.expression === top))) top = top.parent;
    let gesture = false;
    let onJs = false;
    const visit = (n: ts.Node) => {
      if (ts.isIdentifier(n) && n.text === 'Gesture') gesture = true;
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'runOnJS' && n.arguments[0]?.kind === ts.SyntaxKind.TrueKeyword) onJs = true;
      if (ts.isCallExpression(n)) visit(n.expression);
      else if (ts.isPropertyAccessExpression(n)) visit(n.expression);
    };
    visit(top);
    return { gesture, onJs };
  };

  for (const [file, p] of parsed) {
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression;
        if (ts.isIdentifier(callee) && HOOKS[callee.text]) {
          for (const i of HOOKS[callee.text]) if (n.arguments[i]) checkWorklet(n.arguments[i], file, callee.text);
        }
        if (ts.isIdentifier(callee) && END_CALLBACKS[callee.text] !== undefined) {
          const cb = n.arguments[END_CALLBACKS[callee.text]];
          if (cb) checkWorklet(cb, file, `rappel de ${callee.text}`);
        }
        if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'withCallback' && n.arguments[0]) {
          checkWorklet(n.arguments[0], file, 'withCallback');
        }
        if (ts.isPropertyAccessExpression(callee) && GESTURE_CALLBACKS.test(callee.name.text) && n.arguments[0]) {
          const chain = gestureChain(n);
          if (chain.gesture && !chain.onJs) checkWorklet(n.arguments[0], file, `geste .${callee.name.text}`);
        }
      }
      if (isFn(n) && isWorkletFn(n)) checkBody(n, file, `worklet ${ts.isFunctionDeclaration(n) && n.name ? n.name.text : ''}`.trim());
      ts.forEachChild(n, visit);
    };
    visit(p.sf);
  }

  // Appels des fonctions dont des paramètres finissent dans un worklet
  for (const [file, p] of parsed) {
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const k = kindOf(n.expression.text, file);
        const params = typeof k === 'object' ? workletParams.get(k.fn) : undefined;
        if (params) for (const i of params) if (n.arguments[i]) checkWorklet(n.arguments[i], file, `argument de ${n.expression.text}`);
      }
      ts.forEachChild(n, visit);
    };
    visit(p.sf);
  }
  return faults;
}

export function readSources(rootDir: string, paths: string[]): Source[] {
  return paths.map((path) => ({ path, text: readFileSync(join(rootDir, path), 'utf8') }));
}
