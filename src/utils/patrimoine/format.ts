// Affichage des montants du suivi de patrimoine : mode discret, montants
// arrondis à l'euro au-delà de 1 000 €, quantités, « Mis à jour il y a n min ».
// Sans React : testable avec Node.

import { formatVariationPercent } from '@/src/utils/format';

const NBSP = ' ';
const NNBSP = ' ';
const MINUS = '−';

// Points qui remplacent un montant en mode discret
export const HIDDEN = '•••••';

function grouped(value: number, decimals: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    .format(Math.abs(value))
    .replace(/[\s  ]/g, NNBSP);
}

function symbol(currency: string): string {
  return currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'CHF' ? 'CHF' : '€';
}

// 48 320 € ; 805 € ; 12,40 € ; 0,0123 € (petits cours de cryptos) ; « ••••• € »
// en mode discret. À partir de 100 €, arrondi à l'euro ; `exact` garde les
// centimes (prix unitaire, prix de revient).
export function money(value: number, opts: { hidden?: boolean; currency?: string; exact?: boolean } = {}): string {
  const cur = symbol(opts.currency ?? 'EUR');
  if (opts.hidden) return `${HIDDEN}${NBSP}${cur}`;
  const abs = Math.abs(value);
  const decimals = abs > 0 && abs < 1 ? 4 : opts.exact || abs < 100 ? 2 : 0;
  const sign = value < 0 && abs >= 0.5 / 10 ** decimals ? MINUS : '';
  return `${sign}${grouped(value, decimals)}${NBSP}${cur}`;
}

// + 6 320 € ; − 95 € ; masqué en mode discret
export function signedMoney(value: number, opts: { hidden?: boolean; currency?: string; exact?: boolean } = {}): string {
  if (opts.hidden) return money(0, opts);
  const body = money(Math.abs(value), opts);
  if (Math.abs(value) < 0.005) return body;
  return `${value > 0 ? '+' : MINUS}${NBSP}${body}`;
}

export function signedPercent(value: number | null, hidden = false): string {
  if (hidden) return `${HIDDEN}${NBSP}%`;
  return value === null ? '—' : formatVariationPercent(value);
}

// 5 ; 0,12 ; 0,0012 ; 1 234,5678 (jusqu'à 8 décimales, sans zéros inutiles)
export function quantity(value: number): string {
  const text = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 8 })
    .format(Math.abs(value))
    .replace(/[\s  ]/g, NNBSP);
  return value < 0 ? `${MINUS}${text}` : text;
}

// « 5 SOL », « 42 parts », « 0,12 BTC »
export function quantityLabel(value: number, ticker: string, type: string): string {
  const q = quantity(value);
  if (type === 'crypto') return `${q}${NBSP}${ticker.replace(/[-.].*$/, '')}`;
  if (type === 'livret') return 'Épargne';
  return `${q}${NBSP}${value >= 2 ? 'parts' : 'part'}`;
}

// « Mis à jour à l'instant », « il y a 3 min », « il y a 2 h », « hier »
export function updatedLabel(at: number | null, now: number): string {
  if (!at) return '';
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "Mis à jour à l'instant";
  if (minutes < 60) return `Mis à jour il y a ${minutes}${NBSP}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Mis à jour il y a ${hours}${NBSP}h`;
  return 'Mis à jour il y a plus d’un jour';
}

// Initiales d'une pastille sans logo : « SOL » → « SO », « CW8.PA » → « CW »,
// « Livret A » → « LA »
export function initials(name: string, ticker: string): string {
  const base = ticker.replace(/[^A-Za-z0-9]/g, '');
  if (base.length >= 2 && !/^(LIVRET|CUSTOM)/i.test(ticker)) return base.slice(0, 2).toUpperCase();
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-zÀ-ÿ0-9]/g, ''))
    .filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (name || ticker).slice(0, 2).toUpperCase();
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// « 14 sept. » (année en cours) ou « 14 sept. 2025 »
export function shortDate(iso: string | number, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const base = `${d.getDate()}${NBSP}${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

// « 2 juin 2026 »
export function longDate(iso: string | number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${d.getDate()}${NBSP}${months[d.getMonth()]} ${d.getFullYear()}`;
}
