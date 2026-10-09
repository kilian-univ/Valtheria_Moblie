import { ComponentProps, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import GoldHalo from '@/src/components/common/GoldHalo';
import GroundShadow from '@/src/components/common/GroundShadow';
import { StaggerItem } from '@/src/components/common/Stagger';
import ValFullBody from '@/src/components/common/ValFullBody';
import { DECOR_IMAGES } from '@/src/constants/decorImages';
import { ModuleColors, palette, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { celebrate, success, warning } from '@/src/utils/haptics';
import { LessonView } from '@/src/utils/learning';
import {
  bubbleRect,
  CASE_RADIUS,
  completedRatio,
  currentIndex,
  DECOR_SHADOW_H,
  DecorSpot,
  decorSpots,
  HALO_SIZE,
  moduleDone,
  NODE_EDGE,
  NODE_SIZES,
  nodeRect,
  PARALLAX_MAX,
  PARALLAX_FACTOR,
  pathContentHeight,
  Rect,
  ringRect,
  StepIcon,
  stepIcon,
  Unlock,
  VAL_SHADOW_H,
  VAL_SHADOW_RATIO,
  VAL_W,
  valSpots,
  viewShape,
} from '@/src/utils/modulePath';
import PathNode, { NodeColors } from './PathNode';
import PathRing from './PathRing';
import StartBubble from './StartBubble';
import TrophyGlow from './TrophyGlow';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<StepIcon, IconName> = { star: 'star', book: 'book', barbell: 'barbell', flash: 'flash' };
const ICON_SIZE = 32;
const TROPHY_ICON_SIZE = 40;
// Étoile des ronds verrouillés : ivoire à 22 %
const LOCKED_ICON_OPACITY = 0.22;
// Halo de la couleur du module derrière le rond en cours
const CURRENT_HALO_OPACITY = 0.25;
// Ombres au sol de Val et des décors
const VAL_SHADOW_OPACITY = 0.55;
const DECOR_SHADOW_OPACITY = 0.4;
// Déverrouillage : le rond réussi se remplit, puis le suivant s'ouvre
const UNLOCK_DELAY = 650;
const BOTTOM_ROOM = 32;

type ModulePathProps = {
  moduleId: number;
  views: LessonView[];
  colors: ModuleColors;
  // Largeur disponible (mesurée par l'écran)
  width: number;
  // Retour d'une leçon réussie : animation à jouer (une fois)
  unlock: Unlock | null;
  onOpen: (view: LessonView, rect: Rect) => void;
  // Position (dans le chemin) du rond à montrer : leçon en cours, sinon trophée
  onFocusRect: (rect: Rect) => void;
  // Effet de profondeur des décors : défilement, hauteur visible, haut du
  // chemin dans le contenu
  scrollY: SharedValue<number>;
  viewport: number;
  pathTop: number;
};

// Chemin du module : un rond par étape en vague, le trophée au bout, Val dans
// un virage sur deux, des décors au bord. Positions calculées dans
// utils/modulePath.
export default function ModulePath({
  moduleId,
  views,
  colors,
  width,
  unlock,
  onOpen,
  onFocusRect,
  scrollY,
  viewport,
  pathTop,
}: ModulePathProps) {
  const { colorScheme } = useTheme();
  const theme = palette[colorScheme];
  const reduced = useReducedMotion();
  const [shakes, setShakes] = useState<Record<number, number>>({});

  const current = currentIndex(views);
  const done = moduleDone(views);
  const ratio = completedRatio(views);
  const trophyIndex = views.length;

  // Terminé : l'or (couleur des récompenses) ; en cours : couleur du module
  const goldColors: NodeColors = { face: theme.gold, deep: theme.goldDeep, icon: theme.ivory };
  const moduleNode: NodeColors = { face: colors.face, deep: colors.deep, icon: theme.ivory };
  const off: NodeColors = {
    face: theme.pathLockedFace,
    deep: theme.pathLockedDeep,
    icon: withOpacity(theme.ivory, LOCKED_ICON_OPACITY),
  };

  const focusIndex = current >= 0 ? current : trophyIndex;
  const focusShape = current >= 0 ? viewShape(views[current]) : 'trophy';
  const focusRect = width > 0 ? nodeRect(focusIndex, width, focusShape) : null;
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
  const vals = valSpots(views, width);
  const decors = decorSpots(moduleId, views, width, vals);
  const trophyRect = nodeRect(trophyIndex, width, 'trophy');
  const currentShape = current >= 0 ? viewShape(views[current]) : 'lesson';

  return (
    <View style={{ width, height: pathContentHeight(trophyIndex, decors) + BOTTOM_ROOM }}>
      {/* Décors au second plan : ni touchables, ni lus */}
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        {decors.map((decor) => (
          <Decor
            key={`${decor.row}-${decor.name}`}
            decor={decor}
            scrollY={scrollY}
            viewport={viewport}
            pathTop={pathTop}
            parallax={!reduced}
          />
        ))}
      </View>

      {/* Val, sous les ronds, avec son ombre au sol */}
      {vals.map((spot) => (
        <View
          key={`val-${spot.bend}`}
          pointerEvents="none"
          style={[styles.abs, { left: spot.rect.x, top: spot.rect.y }]}
        >
          <StaggerItem index={Math.min(spot.bend, 7)}>
            <GroundShadow
              width={VAL_W * VAL_SHADOW_RATIO}
              height={VAL_SHADOW_H}
              opacity={VAL_SHADOW_OPACITY}
              left={(VAL_W * (1 - VAL_SHADOW_RATIO)) / 2}
              top={spot.rect.h - VAL_SHADOW_H}
            />
            <ValFullBody pose={spot.pose} height={spot.rect.h} width={VAL_W} breathe />
          </StaggerItem>
        </View>
      ))}

      {/* Anneau autour du rond en cours */}
      {current >= 0 ? (
        <View style={[styles.abs, rectPos(ringRect(current, width, currentShape))]}>
          <PathRing progress={ratio} color={colors.face} appearDelay={unlockingCurrent ? UNLOCK_DELAY : undefined} />
        </View>
      ) : null}

      {views.map((view, i) => {
        const shape = viewShape(view);
        const size = NODE_SIZES[shape];
        const rect = nodeRect(i, width, shape);
        const isLit = view.status !== 'locked';
        const isCurrent = view.status === 'current';
        const justDone = unlock?.completedId === view.lesson.id;
        const justUnlocked = unlock?.unlockedId === view.lesson.id;
        const icon = ICONS[stepIcon(view.lesson, view.number, view.status === 'completed')];
        const label =
          view.status === 'locked'
            ? `Étape ${view.number}, ${view.lesson.title}, verrouillée`
            : `Étape ${view.number}, ${view.lesson.title}, ${view.status === 'completed' ? 'terminée' : 'en cours'}`;
        return (
          <View key={view.lesson.id} style={[styles.abs, { left: rect.x, top: rect.y }]}>
            <StaggerItem index={i}>
              <PathNode
                width={size.w}
                faceHeight={size.face}
                edge={NODE_EDGE}
                cornerRadius={shape === 'case' ? CASE_RADIUS : undefined}
                iconName={icon}
                iconSize={ICON_SIZE}
                on={view.status === 'completed' ? goldColors : moduleNode}
                off={off}
                lit={isLit}
                litDelay={justUnlocked ? UNLOCK_DELAY : undefined}
                popSignal={justDone ? 1 : 0}
                shakeSignal={(shakes[view.lesson.id] ?? 0) + (justUnlocked ? 1 : 0)}
                onPress={() => (isLit ? onOpen(view, rect) : shake(view.lesson.id))}
                accessibilityLabel={label}
                accessibilityHint={isLit ? 'Ouvre la carte de la leçon' : 'Termine l’étape précédente pour la débloquer'}
                behind={
                  isCurrent ? (
                    <CurrentHalo width={size.w} faceHeight={size.face} color={withOpacity(colors.face, CURRENT_HALO_OPACITY)} />
                  ) : null
                }
              />
            </StaggerItem>
          </View>
        );
      })}

      {/* Trophée au bout du chemin */}
      <View style={[styles.abs, { left: trophyRect.x, top: trophyRect.y }]}>
        <StaggerItem index={Math.min(trophyIndex, 7)}>
          <PathNode
            width={NODE_SIZES.trophy.w}
            faceHeight={NODE_SIZES.trophy.face}
            edge={NODE_EDGE}
            iconName="trophy"
            iconSize={TROPHY_ICON_SIZE}
            on={goldColors}
            off={off}
            lit={done}
            litDelay={unlock?.trophy ? UNLOCK_DELAY : undefined}
            shakeSignal={shakes[-1] ?? 0}
            onPress={() => (done ? undefined : shake(-1))}
            accessibilityLabel={done ? 'Trophée du module, gagné' : 'Trophée du module, à gagner'}
            accessibilityHint={done ? undefined : 'Termine toutes les étapes pour le gagner'}
            behind={done ? <TrophyGlow appearDelay={unlock?.trophy ? UNLOCK_DELAY : undefined} /> : null}
          />
        </StaggerItem>
      </View>

      {/* Bulle au-dessus du rond en cours, par-dessus tout */}
      {current >= 0 ? (
        <View style={[styles.abs, rectPos(bubbleRect(current, width, currentShape))]}>
          <StartBubble
            textColor={colors.deep}
            onPress={() => onOpen(views[current], nodeRect(current, width, currentShape))}
            appearDelay={unlockingCurrent ? UNLOCK_DELAY : undefined}
          />
        </View>
      ) : null}
    </View>
  );
}

// Halo de la couleur du module derrière le rond en cours (carré de 112 au
// plus 1,5 fois le rond, centré sur la face, jamais rogné)
function CurrentHalo({ width, faceHeight, color }: { width: number; faceHeight: number; color: string }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.abs,
        { width: HALO_SIZE, height: HALO_SIZE, left: (width - HALO_SIZE) / 2, top: (faceHeight - HALO_SIZE) / 2 },
      ]}
    >
      <GoldHalo color={color} />
    </View>
  );
}

// Un décor : au second plan (image assombrie), légère rotation, ombre au sol,
// et il défile à 92 % de la vitesse du chemin (pas avec les animations réduites)
function Decor({
  decor,
  scrollY,
  viewport,
  pathTop,
  parallax,
}: {
  decor: DecorSpot;
  scrollY: SharedValue<number>;
  viewport: number;
  pathTop: number;
  parallax: boolean;
}) {
  const { rect } = decor;
  const centerY = pathTop + rect.y + rect.w / 2;

  const style = useAnimatedStyle(() => {
    if (!parallax || viewport <= 0) return { transform: [{ translateY: 0 }] };
    const shift = (scrollY.get() + viewport / 2 - centerY) * PARALLAX_FACTOR;
    return { transform: [{ translateY: Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, shift)) }] };
  });

  return (
    <Animated.View style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }, style]}>
      <GroundShadow
        width={rect.w * 0.7}
        height={DECOR_SHADOW_H}
        opacity={DECOR_SHADOW_OPACITY}
        left={rect.w * 0.15}
        top={rect.w - DECOR_SHADOW_H / 2 - 4}
      />
      {/* Images déjà assombries (80 %) à la conversion : aucun filtre ici, un
          filtre peut rendre un calque opaque sur iOS */}
      <Image
        source={DECOR_IMAGES[decor.name]}
        resizeMode="contain"
        style={{ width: rect.w, height: rect.w, transform: [{ rotate: `${decor.rotation}deg` }] }}
      />
    </Animated.View>
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
