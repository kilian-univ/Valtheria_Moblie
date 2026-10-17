/// <reference types="node" />
// Lancer : npm test
// Relevés anormaux des courbes (utils/patrimoine/anomalies.ts) et icônes des
// placements sans cours (utils/patrimoine/assetIcons.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { anomalyIndexes, splitAnomalies } from '../src/utils/patrimoine/anomalies';
import { ASSET_ICONS, FAMILY_COLORS, ICON_KEYS, NO_PRICE_SUGGESTIONS, recognizeIcon, suggestionsFor, type IconKey } from '../src/utils/patrimoine/assetIcons';
import { parseChart } from '../src/utils/patrimoine/model';
import { parsePrefs, setIcon } from '../src/utils/patrimoine/prefs';

// Points d'un tracé SVG (absolu) : extrémités, et points de contrôle des courbes
function pathPoints(d: string): number[][] {
  const out: number[][] = [];
  let cur = [0, 0];
  for (const seg of d.match(/[MLHVCQAZ][^MLHVCQAZ]*/g) ?? []) {
    const n = (seg.slice(1).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const cmd = seg[0];
    if (cmd === 'H') cur = [n[0], cur[1]];
    else if (cmd === 'V') cur = [cur[0], n[0]];
    else if (cmd === 'A') cur = [n[5], n[6]];
    else if (cmd !== 'Z') {
      for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
      cur = [n[n.length - 2], n[n.length - 1]];
    }
    if (cmd !== 'Z') out.push(cur);
  }
  return out;
}

// Courbe calme autour de 28 000 €, petites variations régulières
const calm = (n: number) => Array.from({ length: n }, (_, i) => 28000 + Math.round(Math.sin(i * 1.7) * 150));

test('relevés anormaux : le relevé faux du 24 septembre (un cours manquant) est repéré', () => {
  const v = [28119, 28101, 20391, 28102, 28080, 28150];
  assert.deepEqual(anomalyIndexes(v), [2]);
});

test('relevés anormaux : une courbe calme ou agitée sans pic ne perd aucun point', () => {
  assert.deepEqual(anomalyIndexes(calm(60)), []);
  // Une crypto : ±6 % d'un jour à l'autre, sans retour brutal
  const crypto = Array.from({ length: 60 }, (_, i) => 100 * (1 + 0.06 * Math.sin(i * 2.3)));
  assert.deepEqual(anomalyIndexes(crypto), []);
});

test('relevés anormaux : un versement (palier qui reste) n’est pas un relevé faux', () => {
  assert.deepEqual(anomalyIndexes([20000, 20050, 20020, 26000, 26040, 26010, 26080]), []);
});

test('relevés anormaux : chute ou hausse de plus de 30 % qui revient aussitôt', () => {
  // En bord de courbe : la fenêtre de 5 points manque, la règle simple suffit
  assert.deepEqual(anomalyIndexes([1000, 600, 1010, 1005]), [1]);
  assert.deepEqual(anomalyIndexes([1000, 1400, 990, 1000]), [1]);
  // 25 % qui revient : trop peu pour la règle simple, sans fenêtre complète
  assert.deepEqual(anomalyIndexes([1000, 750, 1000, 1000]), []);
});

test('relevés anormaux : premier et dernier points jamais jugés', () => {
  assert.deepEqual(anomalyIndexes([5000, 28000, 28010, 27990, 28005]), []);
  assert.deepEqual(anomalyIndexes([28000, 28010, 27990, 28005, 5000]), []);
  assert.deepEqual(anomalyIndexes([]), []);
  assert.deepEqual(anomalyIndexes([1]), []);
});

test('relevés anormaux : masqués par défaut, tous gardés avec « Afficher tout »', () => {
  const pts = [28119, 28101, 20391, 28102, 28080].map((value, i) => ({ id: i + 1, value }));
  const hidden = splitAnomalies(pts, (p) => p.value, true);
  assert.deepEqual(hidden.kept.map((p) => p.id), [1, 2, 4, 5], 'la courbe relie les voisins');
  assert.deepEqual(hidden.hidden.map((p) => p.id), [3]);
  const all = splitAnomalies(pts, (p) => p.value, false);
  assert.equal(all.kept.length, 5);
  assert.deepEqual(all.hidden.map((p) => p.id), [3], 'le menu les compte quand même');
});

test('courbe : chaque point garde l’identifiant de son relevé', () => {
  const pts = parseChart({
    points: [
      { id: 559, date: '2026-09-24T12:00:32+00:00', value: 20391.77, invested: 19958, is_snapshot: true },
      { id: null, date: '2026-10-17T00:00:00+00:00', value: 27071, invested: 19744, is_snapshot: false },
      { date: '2026-10-18T00:00:00+00:00', value: 27100, invested: 19744 },
    ],
  });
  assert.deepEqual(pts.map((p) => p.id), [559, null, null]);
});

test('icônes : reconnues d’après le nom ou le symbole d’un placement sans cours', () => {
  const r = (ticker: string, name: string, type: 'livret' | 'autre' = 'livret') => recognizeIcon({ ticker, name, type });
  assert.equal(r('LIVRET_A', 'Livret A'), 'livret-a');
  assert.equal(r('LIVRET_1729000000', 'Mon Livret A'), 'livret-a');
  assert.equal(r('LDDS', 'Livret de Développement Durable et Solidaire'), 'ldds');
  assert.equal(r('LEP', 'Livret d’Épargne Populaire'), 'lep');
  assert.equal(r('LIVRET_JEUNE', 'Livret Jeune'), 'livret-jeune');
  assert.equal(r('PEL', 'Plan d’Épargne Logement'), 'pel');
  assert.equal(r('CEL', 'Compte Épargne Logement'), 'cel');
  assert.equal(r('LIVRET_1729000000', 'Livret Boursorama'), 'livret-bancaire');
  assert.equal(r('LIVRET_1729000000', 'Compte à terme 12 mois'), 'livret-bancaire');
  assert.equal(r('CUSTOM_AUTRE_1729000000', 'Compte courant', 'autre'), 'compte-courant');
  assert.equal(r('CUSTOM_AUTRE_1729000000', 'Assurance vie Linxea', 'autre'), 'assurance-vie');
  assert.equal(r('CUSTOM_AUTRE_1729000000', 'PER Yomoni', 'autre'), 'per');
  assert.equal(r('CUSTOM_IMMOBILIER_1729000000', 'Appartement Lyon', 'autre'), 'immobilier');
  assert.equal(r('CUSTOM_IMMOBILIER_1729000000', 'Studio', 'autre'), 'immobilier');
  assert.equal(r('CUSTOM_AUTRE_1729000000', 'Parts de SCPI', 'autre'), 'scpi');
  assert.equal(r('CUSTOM_OBJET_1729000000', 'Lingot de 100 g', 'autre'), 'or');
  assert.equal(r('CUSTOM_OBJET_1729000000', 'Montre', 'autre'), 'objet');
  assert.equal(r('CUSTOM_OBJET_1729000000', 'Collection de timbres', 'autre'), 'objet');
});

test('icônes : à défaut, la pastille à initiales (rien de reconnu)', () => {
  assert.equal(recognizeIcon({ ticker: 'LIVRET_1729000000', name: 'Mon matelas', type: 'livret' }), null);
  assert.equal(recognizeIcon({ ticker: 'CUSTOM_AUTRE_1729000000', name: 'Prêt à mon frère', type: 'autre' }), null);
  // Un actif coté garde son logo ou ses initiales, même si son nom ressemble
  assert.equal(recognizeIcon({ ticker: 'PEL.PA', name: 'PEL', type: 'action' }), null);
  assert.equal(recognizeIcon({ ticker: 'GLD', name: 'Lingot ETF', type: 'etf' }), null);
});

test('icônes : 14 dessins, chacun dans sa famille et dans son cadre', () => {
  assert.equal(ASSET_ICONS.length, 14);
  assert.equal(new Set(ICON_KEYS).size, 14);
  const expected: Record<string, IconKey[]> = {
    reglementee: ['livret-a', 'ldds', 'lep', 'livret-jeune'],
    logement: ['pel', 'cel'],
    bancaire: ['livret-bancaire', 'compte-courant'],
    assurance: ['assurance-vie', 'per'],
    immobilier: ['immobilier', 'scpi'],
    biens: ['or', 'objet'],
  };
  for (const [family, keys] of Object.entries(expected)) {
    assert.deepEqual(ASSET_ICONS.filter((i) => i.family === family).map((i) => i.key), keys);
    assert.match(FAMILY_COLORS[family as keyof typeof FAMILY_COLORS], /^#[0-9a-fA-F]{6}$/);
  }
  // Symbole au centre : rien ne touche le liseré (rond de rayon 19)
  for (const icon of ASSET_ICONS) {
    assert.ok(icon.shapes.length > 0, icon.key);
    for (const s of icon.shapes) {
      const pts =
        s.kind === 'circle'
          ? [[s.cx - s.r, s.cy - s.r], [s.cx + s.r, s.cy + s.r]]
          : s.kind === 'rect'
            ? [[s.x, s.y], [s.x + s.w, s.y + s.h]]
            : pathPoints(s.d);
      for (const [x, y] of pts) {
        assert.ok(Math.hypot(x - 20, y - 20) <= 16.5, `${icon.key} : point (${x}, ${y}) trop près du bord`);
      }
    }
  }
});

test('icônes : chaque suggestion de la recherche est reconnue avec sa propre icône', () => {
  assert.deepEqual(
    NO_PRICE_SUGGESTIONS.map((s) => s.name),
    ['Livret A', 'LDDS', 'LEP', 'Livret Jeune', 'PEL', 'CEL', 'Assurance vie', 'PER']
  );
  for (const s of NO_PRICE_SUGGESTIONS) {
    const asset = s.form === 'livret' ? { ticker: s.ticker, name: s.name, type: 'livret' as const } : { ticker: 'CUSTOM_AUTRE_1', name: s.name, type: 'autre' as const };
    assert.equal(recognizeIcon(asset), s.icon, s.name);
  }
});

test('recherche : les placements sans cours répondent au nom court ou complet', () => {
  assert.equal(suggestionsFor('').length, 8);
  assert.deepEqual(suggestionsFor('livret').map((s) => s.name), ['Livret A', 'LDDS', 'LEP', 'Livret Jeune']);
  assert.deepEqual(suggestionsFor('épargne log').map((s) => s.name), ['PEL', 'CEL']);
  assert.deepEqual(suggestionsFor('retraite').map((s) => s.name), ['PER']);
  assert.deepEqual(suggestionsFor('pel').map((s) => s.name), ['PEL']);
  assert.deepEqual(suggestionsFor('solana'), []);
});

test('préférences : relevés anormaux masqués par défaut, icônes choisies par symbole', () => {
  assert.equal(parsePrefs(null).hideAnomalies, true);
  assert.equal(parsePrefs({ hideAnomalies: false }).hideAnomalies, false);
  assert.equal(parsePrefs({ hideAnomalies: 'non' }).hideAnomalies, true);
  const p = parsePrefs({ icons: { livret_1: 'pel', CUSTOM_X: 'licorne', '': 'or' } });
  assert.deepEqual(p.icons, { LIVRET_1: 'pel' });
  const chosen = setIcon(p, 'custom_autre_9', 'assurance-vie');
  assert.equal(chosen.icons.CUSTOM_AUTRE_9, 'assurance-vie');
  assert.deepEqual(setIcon(chosen, 'CUSTOM_AUTRE_9', null).icons, { LIVRET_1: 'pel' }, 'retour à l’automatique');
});
