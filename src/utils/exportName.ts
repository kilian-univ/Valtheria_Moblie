// Nom du fichier d'export des données : « valtheria-mes-donnees-2026-10-17.json ».
// Fonction pure, testable avec Node.
export function exportFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `valtheria-mes-donnees-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
