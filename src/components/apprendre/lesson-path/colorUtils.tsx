// Assombrit une couleur hex d'un certain pourcentage (0-1). Utilisé pour
// simuler l'ombre "3D" sous les boutons de leçon, façon Duolingo.
export function darken(hex: string, amount = 0.22): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);

  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));

  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}