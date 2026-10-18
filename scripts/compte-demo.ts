/// <reference types="node" />
// Remplit le compte de démonstration de la relecture d'Apple, PAR L'API, comme le ferait l'app :
// leçons publiées jouées juste (code de l'app : lecture, réponses des écrans, correction locale),
// patrimoine (deux livrets, un ETF et un peu de bitcoin achetés chaque mois depuis six mois, aux
// cours de l'époque), budget en mode Détaillé (mise en route, soldes de fin de mois, dépenses
// notées, une enveloppe). Le bilan du mois dernier est laissé sans réponse : il s'ouvre seul à la
// première ouverture de Mon budget.
//
// Le compte se crée d'abord sur le serveur : php artisan review:compte-demo creer --email=…
// Puis, depuis la racine de l'app :
//   node --import ./tests/register.mjs scripts/compte-demo.ts https://valtheria.fr/api <e-mail> <mot de passe>
//
// À lancer une seule fois sur un compte neuf : relancer ajouterait les opérations une deuxième fois.

import type { CollectedAnswer } from '@/src/components/apprendre/types';
import { initialAllocation, moveAllocation } from '@/src/lesson/interactive';
import type { LessonScreen } from '@/src/lesson/model';
import { normalizeLesson } from '@/src/lesson/normalize';
import { addDays, firstOfMonth, localToday, monthKey, type Day as BudgetDay } from '@/src/utils/budget/dates';
import { draftFrom, setupPayload } from '@/src/utils/budget/setup';
import { buildResponses, isGradable } from '@/src/utils/lessonPlayer';
import { livretPayload, operationPayload } from '@/src/utils/patrimoine/forms';
import { parsePriceHistory } from '@/src/utils/patrimoine/model';

const [base, email, password] = process.argv.slice(2);
if (!base || !email || !password) throw new Error('Usage : <base API> <e-mail> <mot de passe>');

let token = '';
async function call(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json)}`);
  return json?.data ?? json;
}

// ── Leçons : la réponse juste de chaque écran, comme l'écran de l'app l'enverrait ──
function rightAnswer(s: LessonScreen): unknown | undefined {
  switch (s.kind) {
    case 'choice': {
      const ids = s.options.filter((o) => o.correct).map((o) => o.id);
      return s.multiple ? ids : ids[0];
    }
    case 'document': {
      const ids = s.lines.filter((l) => l.id !== null && l.type !== 'section' && l.correct).map((l) => l.id as string);
      return s.mode === 'pick' ? ids[0] : ids;
    }
    case 'slider':
      return s.answer ?? s.start;
    case 'dialogue':
      return s.replies.find((r) => r.correct)?.id;
    case 'true_false':
      return Object.fromEntries(s.cards.map((c) => [c.id, c.answer]));
    case 'order':
      return s.items.map((it) => it.id);
    case 'match':
      return { errors: 0, found: s.pairs.map((p) => p.id) };
    case 'allocate': {
      let values = initialAllocation(s.buckets);
      for (const r of s.rules) values = moveAllocation(s, values, r.bucket, Math.max(values[r.bucket] ?? 0, r.min));
      return values;
    }
    default:
      return undefined;
  }
}

async function playLessons(): Promise<string[]> {
  const done: string[] = [];
  const modules: any[] = await call('GET', '/modules');
  for (const m of modules) {
    for (const l of m.lessons ?? []) {
      if (l.completed) continue;
      const lesson = normalizeLesson(await call('GET', `/lessons/${l.id}`));
      const answers: CollectedAnswer[] = [];
      for (const s of lesson.screens) {
        if (!isGradable(s)) continue;
        const raw = rightAnswer(s);
        if (raw === undefined) continue;
        answers.push({ screenIndex: s.index, type: s.kind, correct: true, raw } as CollectedAnswer);
      }
      await call('POST', `/lessons/${l.id}/start`);
      const r = await call('POST', `/lessons/${l.id}/complete`, { responses: buildResponses(answers, lesson.screens) });
      done.push(`${l.title} : ${r.first_try_correct}/${r.scored_total}, ${r.status}`);
    }
  }
  return done;
}

// ── Patrimoine ──
const toDay = (d: BudgetDay) => ({ y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)), d: Number(d.slice(8, 10)) });

async function buyMonthly(query: string, type: string, amountEur: number, months: number): Promise<string> {
  const found: any = await call('GET', `/search?q=${encodeURIComponent(query)}&type=${type}`);
  const asset = (Array.isArray(found?.results) ? found.results : []).find((a: any) => a?.ticker);
  if (!asset) throw new Error(`Aucun actif trouvé pour « ${query} »`);
  const { points, currency } = parsePriceHistory(await call('GET', `/prices/history?ticker=${encodeURIComponent(asset.ticker)}&range=1Y`));
  if (points.length === 0) throw new Error(`Pas de cours pour ${asset.ticker}`);
  const today = localToday();
  let bought = 0;
  for (let i = months; i >= 1; i--) {
    // Le 5 de chaque mois : le cours connu le plus proche, avant cette date
    const day = addDays(firstOfMonth(monthShift(today, -i + 1)), 4);
    const at = Date.parse(`${day}T12:00:00Z`);
    const point = [...points].reverse().find((p) => p.t <= at) ?? points[0];
    const quantity = Math.round((amountEur / point.price) * 1e6) / 1e6;
    const p = operationPayload({
      side: 'buy',
      ticker: asset.ticker,
      name: asset.name ?? asset.ticker,
      type: asset.type ?? type,
      quantity: String(quantity),
      unitPrice: String(Math.round(point.price * 100) / 100),
      fees: '0',
      currency,
      day: toDay(day),
    });
    if (!p.ok) throw new Error(p.message);
    await call('POST', '/portfolio/operations', p.body);
    bought += 1;
  }
  return `${asset.name ?? asset.ticker} (${asset.ticker}) : ${bought} achats de ${amountEur} €`;
}

function monthShift(day: BudgetDay, n: number): BudgetDay {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7)) - 1 + n;
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 10);
}

async function fillPatrimoine(): Promise<string[]> {
  const out: string[] = [];
  for (const [ticker, name, amount] of [
    ['LIVRET_A', 'Livret A', '4200'],
    ['LDDS', 'LDDS', '1500'],
  ] as const) {
    const p = livretPayload({ ticker, name, amount, ratePct: '' }, Date.now());
    if (!p.ok) throw new Error(p.message);
    await call('POST', '/portfolio/positions', p.body);
    out.push(`${name} : ${amount} €`);
  }
  out.push(await buyMonthly('MSCI World', 'etf', 150, 6));
  out.push(await buyMonthly('Bitcoin', 'crypto', 30, 6));
  return out;
}

// ── Budget (mode Détaillé) ──
const INCOME = 1850;
const PAY_DAY = 28;
const SAVING = 200;
const CHARGES: Record<string, [number, number]> = {
  logement: [620, 5],
  energie: [65, 12],
  telecom: [30, 8],
  assurances: [25, 15],
  transport: [45, 2],
  abonnements: [32, 20],
};
const CHARGES_TOTAL = Object.values(CHARGES).reduce((t, [amount]) => t + amount, 0);
// Dépenses notées chaque mois (jour, catégorie, libellé, montant)
const SPENDING: [number, string, string, number][] = [
  [3, 'Courses', 'Courses', 64.2],
  [9, 'Courses', 'Courses', 52.8],
  [11, 'Sorties', 'Cinéma', 12],
  [14, 'Restaurants', 'Restaurant', 27.5],
  [17, 'Courses', 'Courses', 71.4],
  [22, 'Sorties', 'Concert', 35],
  [25, 'Courses', 'Courses', 48.9],
  [26, 'Shopping', 'Vêtements', 39.99],
];

async function fillBudget(): Promise<string[]> {
  const today = localToday();
  const draft = draftFrom(null);
  draft.income = INCOME;
  draft.payDay = PAY_DAY;
  draft.saving = SAVING;
  draft.savingTouched = true;
  draft.mode = 'detaille';
  draft.charges = draft.charges.map((c) => (CHARGES[c.key] ? { ...c, amount: CHARGES[c.key][0], day: CHARGES[c.key][1] } : c));
  draft.balance = 1320;
  await call('POST', '/budget/setup', setupPayload(draft));

  // Enveloppe « Courses » à 280 € par mois (comme l'app : la catégorie existante, sinon une nouvelle)
  const budget: any = await call('GET', '/budget');
  const courses = (budget?.categories ?? []).find((c: any) => c.name === 'Courses');
  if (courses) await call('PATCH', `/cashflow/categories/${courses.id}`, { envelope_cap: 280 });
  else await call('POST', '/cashflow/categories', { name: 'Courses', envelope_cap: 280 });

  // Trois mois passés et le mois en cours : dépenses notées, et un solde relevé en fin de mois
  let balance = 900;
  for (let i = 3; i >= 0; i--) {
    const first = firstOfMonth(monthShift(today, -i));
    let spent = 0;
    for (const [d, category, label, amount] of SPENDING) {
      const on = addDays(first, d - 1);
      if (on > today || monthKey(on) !== monthKey(first)) continue;
      await call('POST', '/cashflow/entries', { type: 'depense', nature: 'ponctuel', label, category, amount, occurred_on: on });
      spent += amount;
    }
    if (i > 0) {
      // Fin du mois : paie et épargne passées, charges et dépenses déduites, un peu d'imprévu
      balance = Math.round((balance + INCOME - SAVING - CHARGES_TOTAL - spent - 60) * 100) / 100;
      const lastDay = addDays(firstOfMonth(monthShift(today, -i + 1)), -1);
      await call('POST', '/budget/balances', { amount: balance, recorded_on: lastDay });
    } else {
      // Aujourd'hui : fin du mois dernier, moins les charges déjà passées et les dépenses notées
      const passed = Object.values(CHARGES).filter(([, d]) => d <= Number(today.slice(8))).reduce((t, [amount]) => t + amount, 0);
      balance = Math.round((balance - passed - spent - 25) * 100) / 100;
      await call('POST', '/budget/balances', { amount: balance });
    }
  }
  return [
    `Mise en route : ${INCOME} € le ${PAY_DAY}, ${CHARGES_TOTAL} € de charges fixes, ${SAVING} € mis de côté`,
    'Enveloppe Courses : 280 €',
    `Soldes de fin de mois relevés, solde du jour : ${balance} €`,
  ];
}

async function main() {
  const login = await call('POST', '/auth/login', { email, password });
  token = login.token;
  if (!token) throw new Error('Connexion impossible');
  console.log('Leçons :');
  for (const l of await playLessons()) console.log(`  ${l}`);
  console.log('Patrimoine :');
  for (const p of await fillPatrimoine()) console.log(`  ${p}`);
  console.log('Budget :');
  for (const b of await fillBudget()) console.log(`  ${b}`);
  await call('POST', '/auth/logout').catch(() => {});
  console.log('Compte de démonstration rempli.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
