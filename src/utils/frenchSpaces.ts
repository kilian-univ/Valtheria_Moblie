// Espaces insécables à la française, posées à l'affichage : un montant, une
// unité, un « ? » ou un guillemet ne se retrouvent jamais seuls en début de
// ligne. Fonction pure, idempotente, sans React : testable avec Node.
//
// Compatible Hermes : ni propriétés Unicode (\p{…}), ni lookbehind, ni
// drapeau « u » ; seulement des classes, des groupes et des lookahead.
// Les espaces spéciales sont TOUJOURS écrites en échappement : un caractère
// invisible collé dans le source se perd sans bruit (cause du bug actuel).

export const NBSP = '\u00A0'; // insécable : avant € % : » et les unités, après « et n°
export const NNBSP = '\u202F'; // fine insécable : milliers, avant ; ! ?

// Espace « cassable » à remplacer : espace normale ou fine sécable (U+2009)
const SP = '[ \u2009]';
// Ni lettre ni chiffre juste après l'unité : « 3 mois » oui, « 3 hommes » non
const END = '(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])';
const UNITS =
  '€|%|‰|\\$|£|k€|M€|Md€|euros?|ans?|mois|jours?|semaines?|années?|h|min|heures?|minutes?|secondes?|pts?|points?|x|XP|Vals?|fois';

// Morceaux jamais retouchés : adresses web et e-mails
const PROTECTED = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s@]+@[^\s@]+\.[a-z]{2,})/gi;

// 1 000 · 27 071 · 1 000 000 : groupe de tête de 1 à 3 chiffres, non précédé
// d'un chiffre, d'une virgule ou d'un point (« 2024 100 », « 3,141 592 »
// restent tels quels)
const THOUSANDS = new RegExp('(^|[^0-9,.])([0-9]{1,3}(?:' + SP + '[0-9]{3})+)(?![0-9])', 'g');
const THOUSAND_SEP = new RegExp(SP, 'g');
// 850 € · 3,5 % · 30 ans · 14 h · {epargne} % (gabarits des leçons)
const UNIT = new RegExp('([0-9}])' + SP + '(' + UNITS + ')' + END, 'g');
// 14 h 30 : les minutes restent avec l'heure
const HOUR_MINUTES = new RegExp('([0-9]\u00A0h)' + SP + '(?=[0-9]{2}(?![0-9]))', 'g');
// n° 12
const NUMERO = new RegExp('([nN]°)' + SP + '(?=[0-9])', 'g');
// mot ? · mot ! · mot ; suivis d'une fin, d'un blanc ou d'une fermeture
// (« ![image](…) » de Markdown et « a ?b » intacts)
const HIGH_PUNCT = new RegExp('([^\\s])' + SP + '([?!;]+)(?=$|[\\s»"\'’)\\]*.,…])', 'g');
// mot : suite (deux-points suivi d'un blanc ou d'une fin) ; « 14:30 », « 1:2 »,
// « :) » et « https:// » ne bougent pas
const COLON = new RegExp('([^\\s])' + SP + ':(?=$|[\\s*])', 'g');
// « texte » (avec ou sans espace d'origine)
const OPEN_QUOTE = new RegExp('«(?:' + SP + ')?(?=[^\\s])', 'g');
const CLOSE_QUOTE = new RegExp('([^\\s])(?:' + SP + ')?»', 'g');
const NEEDS_WORK = /[ \u2009«»]/;
const THIN = /\u202F/g;

function fix(text: string): string {
  return text
    .replace(THOUSANDS, (_m: string, before: string, group: string) => before + group.replace(THOUSAND_SEP, NNBSP))
    .replace(UNIT, '$1' + NBSP + '$2')
    .replace(HOUR_MINUTES, '$1' + NBSP)
    .replace(NUMERO, '$1' + NBSP)
    .replace(HIGH_PUNCT, '$1' + NNBSP + '$2')
    .replace(COLON, '$1' + NBSP + ':')
    .replace(OPEN_QUOTE, '«' + NBSP)
    .replace(CLOSE_QUOTE, '$1' + NBSP + '»');
}

// Petit cache : les mêmes chaînes reviennent à chaque rendu
const cache = new Map<string, string>();
const CACHE_MAX = 500;

// thin: false → pas d'espace fine (police sans U+202F : Fraunces)
export function frenchSpaces(text: string, opts: { thin?: boolean } = {}): string {
  if (typeof text !== 'string' || !NEEDS_WORK.test(text)) return text;
  let out = cache.get(text);
  if (out === undefined) {
    // split avec groupe capturant : indices impairs = morceaux protégés
    out = text
      .split(PROTECTED)
      .map((part, i) => (i % 2 === 1 ? part : fix(part)))
      .join('');
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(text, out);
  }
  return opts.thin === false ? out.replace(THIN, NBSP) : out;
}
