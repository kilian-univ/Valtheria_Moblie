import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import { springs } from '@/src/constants/motion';
import { fonts, palette, radius, reliefDepth, size, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';
import { clampTime, formatTime, REMINDER_SLOTS, ReminderTime, sameTime } from '@/src/utils/reminder';

const MINUTE_STEP = 15;
const BIG_TIME = 44;

type ReminderPickerProps = {
  value: ReminderTime;
  onChange: (time: ReminderTime) => void;
};

// Trois créneaux en relief (matin, midi, soir), et « Choisir une autre heure »
export default function ReminderPicker({ value, onChange }: ReminderPickerProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const custom = !REMINDER_SLOTS.some((s) => sameTime(s.time, value));

  const pick = (time: ReminderTime) => {
    select();
    onChange(time);
  };

  const openCustom = () => {
    setDraft(value);
    setSheetMounted(true);
    setSheetOpen(true);
  };

  const step = (field: 'hour' | 'minute', delta: number) => {
    select();
    setDraft((d) => clampTime(field === 'hour' ? d.hour + delta : d.hour, field === 'minute' ? d.minute + delta : d.minute));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.slots} accessibilityRole="radiogroup">
        {REMINDER_SLOTS.map((slot) => (
          <Slot
            key={slot.id}
            label={slot.label}
            time={formatTime(slot.time)}
            selected={sameTime(slot.time, value)}
            onPress={() => pick(slot.time)}
          />
        ))}
      </View>

      <Pressable onPress={openCustom} accessibilityRole="button" style={styles.customLink}>
        <AppText variant="callout" tone="gold" style={styles.center}>
          {custom ? `Autre heure : ${formatTime(value)}` : 'Choisir une autre heure'}
        </AppText>
      </Pressable>

      {sheetMounted ? (
        <BottomSheet open={sheetOpen} onRequestClose={() => setSheetOpen(false)} onClosed={() => setSheetMounted(false)}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header" style={styles.center}>
              Choisis ton heure
            </AppText>
            <View style={styles.clock}>
              <Stepper
                label="heures"
                value={String(draft.hour)}
                onMinus={() => step('hour', -1)}
                onPlus={() => step('hour', 1)}
              />
              <AppText style={[styles.bigTime, { color: colors.subtitle }]}>h</AppText>
              <Stepper
                label="minutes"
                value={String(draft.minute).padStart(2, '0')}
                onMinus={() => step('minute', -MINUTE_STEP)}
                onPlus={() => step('minute', MINUTE_STEP)}
              />
            </View>
            <Button
              label={`Valider ${formatTime(draft)}`}
              onPress={() => {
                onChange(draft);
                setSheetOpen(false);
              }}
            />
          </View>
        </BottomSheet>
      ) : null}
    </View>
  );
}

// Créneau en relief : libellé et heure, doré quand il est choisi
function Slot({ label, time, selected, onPress }: { label: string; time: string; selected: boolean; onPress: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.get() * reliefDepth }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press.set(reduced ? 1 : withTiming(1, { duration: 80 }))}
      onPressOut={() => press.set(reduced ? 0 : withSpring(0, springs.press))}
      accessibilityRole="radio"
      accessibilityLabel={`${label}, ${time}`}
      accessibilityState={{ checked: selected }}
      style={styles.slot}
    >
      <View style={[styles.edge, { backgroundColor: selected ? colors.goldDeep : colors.reliefEdge }]} />
      <Animated.View
        style={[
          styles.face,
          { backgroundColor: colors.background, borderColor: selected ? colors.gold : colors.controlBorder },
          faceStyle,
        ]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: selected ? colors.goldSoft : 'transparent' }]} />
        <AppText variant="bodyMedium" style={styles.center}>
          {label}
        </AppText>
        <AppText variant="caption" tone="subtitle" style={styles.center}>
          {time}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const button = (icon: 'chevron-up' | 'chevron-down', onPress: () => void, a11y: string) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.stepButton, pressed && { backgroundColor: colors.surface2 }]}
    >
      <Ionicons name={icon} size={24} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {button('chevron-up', onPlus, `Plus de ${label}`)}
      <AppText maxFontSizeMultiplier={1.2} style={styles.bigTime} accessibilityLabel={`${value} ${label}`}>
        {value}
      </AppText>
      {button('chevron-down', onMinus, `Moins de ${label}`)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[1],
  },
  slots: {
    flexDirection: 'row',
    gap: space[3] - 2,
  },
  slot: {
    flex: 1,
    paddingBottom: reliefDepth,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: reliefDepth,
    borderRadius: radius.option,
    borderCurve: 'continuous',
  },
  face: {
    borderRadius: radius.option,
    borderCurve: 'continuous',
    borderWidth: 2,
    paddingVertical: space[3],
    paddingHorizontal: space[1],
    gap: 2,
    overflow: 'hidden',
  },
  center: {
    textAlign: 'center',
  },
  customLink: {
    minHeight: size.tapMin,
    justifyContent: 'center',
  },
  sheet: {
    gap: space[5],
    paddingHorizontal: space[5],
    paddingBottom: space[2],
  },
  clock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
  },
  stepper: {
    alignItems: 'center',
  },
  stepButton: {
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: size.tapMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigTime: {
    fontFamily: fonts.title,
    fontSize: BIG_TIME,
    lineHeight: 52,
    letterSpacing: titleLetterSpacing(BIG_TIME),
    fontVariant: ['tabular-nums'],
  },
});
