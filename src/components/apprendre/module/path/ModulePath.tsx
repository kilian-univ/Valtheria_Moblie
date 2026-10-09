import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StaggerItem } from '@/src/components/common/Stagger';
import ValFullBody from '@/src/components/common/ValFullBody';
import { ModuleColors, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { celebrate, success, warning } from '@/src/utils/haptics';
import { LessonView } from '@/src/utils/learning';
import {
  bubbleRect,
  completedRatio,
  currentIndex,
  moduleDone,
  NODE_EDGE,
  NODE_FACE_H,
  NODE_W,
  nodeRect,
  pathHeight,
  Rect,
  ringRect,
  TROPHY_FACE_H,
  TROPHY_W,
  Unlock,
  VAL_W,
  valSpots,
} from '@/src/utils/modulePath';
import PathNode, { NodeColors } from './PathNode';
import PathRing from './PathRing';
import StartBubble from './StartBubble';
import TrophyGlow from './TrophyGlow';

const STAR_SIZE = 34;
const TROPHY_ICON_SIZE = 40;
// Déverrouillage : le rond réussi se remplit, puis le suivant s'ouvre
const UNLOCK_DELAY = 650;
const BOTTOM_ROOM = 48;

type ModulePathProps = {
  views: LessonView[];
  colors: ModuleColors;
  // Largeur disponible (mesurée par l'écran)
  width: number;
  // Retour d'une leçon réussie : animation à jouer (une fois)
  unlock: Unlock | null;
  onOpen: (view: LessonView, rect: Rect) => void;
  // Position (dans le chemin) du rond à montrer : leçon en cours, sinon trophée
  onFocusRect: (rect: Rect) => void;
};

// Chemin du module : un rond par leçon en vague, le trophée au bout, Val
// dans un virage sur deux. Positions calculées dans utils/modulePath.
export default function ModulePath({ views, colors, width, unlock, onOpen, onFocusRect }: ModulePathProps) {
  const { colorScheme } = useTheme();
  const theme = palette[colorScheme];
  const [shakes, setShakes] = useState<Record<number, number>>({});

  const current = currentIndex(views);
  const done = moduleDone(views);
  const ratio = completedRatio(views);
  const trophyIndex = views.length;

  const lit: NodeColors = { face: colors.face, deep: colors.deep, icon: colors.onFace };
  const off: NodeColors = { face: theme.pathLockedFace, deep: theme.pathLockedDeep, icon: theme.textFaint };
  const gold: NodeColors = { face: theme.gold, deep: theme.goldDeep, icon: theme.onGold };

  const focusIndex = current >= 0 ? current : trophyIndex;
  const focusRect = width > 0 ? nodeRect(focusIndex, width, focusIndex === trophyIndex) : null;
  const focusKey = focusRect ? `${focusRect.x}|${focusRect.y}` : '';
  useEffect(() => {
    if (focusRect) onFocusRect(focusRect);
    // focusKey résume focusRect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, onFocusRect]);

  // Vibrations du déverrouillage : réussite, puis ouverture du rond suivant
  useEffect(() => {
    if (!unlock) return;
    success();
    const timer = setTimeout(celebrate, UNLOCK_DELAY);
    return () => clearTimeout(timer);
  }, [unlock]);

  if (width <= 0) return null;

  const shake = (key: number) => {
    warning();
    setShakes((s) => ({ ...s, [key]: (s[key] ?? 0) + 1 }));
  };

  const unlockingCurrent = unlock?.unlockedId != null && views[current]?.lesson.id === unlock.unlockedId;
  const spots = valSpots(views, width);
  const trophyRect = nodeRect(trophyIndex, width, true);

  return (
    <View style={{ width, height: pathHeight(trophyIndex + 1) + BOTTOM_ROOM }}>
      {/* Val, sous les ronds */}
      {spots.map((spot) => (
        <View key={`val-${spot.bend}`} style={[styles.abs, { left: spot.rect.x, top: spot.rect.y }]}>
          <StaggerItem index={Math.min(spot.bend, 7)}>
            <ValFullBody pose={spot.pose} height={spot.rect.h} width={VAL_W} breathe />
          </StaggerItem>
        </View>
      ))}

      {/* Anneau autour du rond en cours */}
      {current >= 0 ? (
        <View style={[styles.abs, rectPos(ringRect(current, width))]}>
          <PathRing progress={ratio} color={colors.face} appearDelay={unlockingCurrent ? UNLOCK_DELAY : undefined} />
        </View>
      ) : null}

      {views.map((view, i) => {
        const rect = nodeRect(i, width);
        const isLit = view.status !== 'locked';
        const justDone = unlock?.completedId === view.lesson.id;
        const justUnlocked = unlock?.unlockedId === view.lesson.id;
        const label =
          view.status === 'locked'
            ? `Leçon ${view.number}, ${view.lesson.title}, verrouillée`
            : `Leçon ${view.number}, ${view.lesson.title}, ${view.status === 'completed' ? 'terminée' : 'en cours'}`;
        return (
          <View key={view.lesson.id} style={[styles.abs, { left: rect.x, top: rect.y }]}>
            <StaggerItem index={i}>
              <PathNode
                width={NODE_W}
                faceHeight={NODE_FACE_H}
                edge={NODE_EDGE}
                iconName="star"
                iconSize={STAR_SIZE}
                on={lit}
                off={off}
                lit={isLit}
                litDelay={justUnlocked ? UNLOCK_DELAY : undefined}
                popSignal={justDone ? 1 : 0}
                shakeSignal={(shakes[view.lesson.id] ?? 0) + (justUnlocked ? 1 : 0)}
                onPress={() => (isLit ? onOpen(view, rect) : shake(view.lesson.id))}
                accessibilityLabel={label}
                accessibilityHint={isLit ? 'Ouvre la carte de la leçon' : 'Termine la leçon précédente pour la débloquer'}
              />
            </StaggerItem>
          </View>
        );
      })}

      {/* Trophée au bout du chemin */}
      <View style={[styles.abs, { left: trophyRect.x, top: trophyRect.y }]}>
        <StaggerItem index={Math.min(trophyIndex, 7)}>
          <PathNode
            width={TROPHY_W}
            faceHeight={TROPHY_FACE_H}
            edge={NODE_EDGE}
            iconName="trophy"
            iconSize={TROPHY_ICON_SIZE}
            on={gold}
            off={off}
            lit={done}
            litDelay={unlock?.trophy ? UNLOCK_DELAY : undefined}
            shakeSignal={shakes[-1] ?? 0}
            onPress={() => (done ? undefined : shake(-1))}
            accessibilityLabel={done ? 'Trophée du module, gagné' : 'Trophée du module, à gagner'}
            accessibilityHint={done ? undefined : 'Termine toutes les leçons pour le gagner'}
            behind={done ? <TrophyGlow appearDelay={unlock?.trophy ? UNLOCK_DELAY : undefined} /> : null}
          />
        </StaggerItem>
      </View>

      {/* Bulle au-dessus du rond en cours, par-dessus tout */}
      {current >= 0 ? (
        <View style={[styles.abs, rectPos(bubbleRect(current, width))]}>
          <StartBubble
            textColor={colors.deep}
            onPress={() => onOpen(views[current], nodeRect(current, width))}
            appearDelay={unlockingCurrent ? UNLOCK_DELAY : undefined}
          />
        </View>
      ) : null}
    </View>
  );
}

function rectPos(r: Rect) {
  return { left: r.x, top: r.y };
}

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
});
