import { useEffect, useState } from 'react';

import AppText from '@/src/components/common/AppText';
import { updatedLabel } from '@/src/utils/patrimoine/format';

const TICK_MS = 30_000;

// « Mis à jour il y a… » : seul ce petit texte se redessine toutes les 30 s,
// pas l'écran (ni sa courbe) qui le contient
export default function UpdatedSince({ at }: { at: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <AppText variant="caption" tone="subtitle">
      {updatedLabel(at, now)}
    </AppText>
  );
}
