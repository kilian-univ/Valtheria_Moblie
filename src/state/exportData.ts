import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { exportFileName } from '@/src/utils/exportName';

// Export des données du compte : un vrai fichier JSON, proposé par la
// feuille de partage (Fichiers, AirDrop, Mail…) ; sur le web, téléchargé.
// La copie temporaire est effacée une fois la feuille fermée.
export async function shareJsonFile(data: unknown, now = new Date()): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const name = exportFileName(now);

  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') throw new Error('Téléchargement indisponible');
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) throw new Error('Partage indisponible sur ce téléphone');
  const file = new File(Paths.cache, name);
  try {
    file.create({ overwrite: true });
    file.write(json);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Mes données Valtheria' });
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      // copie temporaire : le système la videra
    }
  }
}
