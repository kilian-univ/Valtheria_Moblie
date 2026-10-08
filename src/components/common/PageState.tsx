import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import AppText from './AppText';
import Button from './Button';
import ValBubble, { ValMood } from './ValBubble';

type EmptyProps = {
  variant: 'empty';
  // Ce que dit Val (le gras **mot** est accepté)
  text: string;
  title?: string;
  mood?: ValMood;
  actionLabel?: string;
  onAction?: () => void;
};

type ErrorProps = {
  variant: 'error';
  title: string;
  message: string;
  retryLabel?: string;
  onRetry: () => void;
};

type OfflineProps = {
  variant: 'offline';
  text: string;
};

type PageStateProps = (EmptyProps | ErrorProps | OfflineProps) & {
  style?: StyleProp<ViewStyle>;
};

const ERROR_ICON_SIZE = 40;
const OFFLINE_ICON_SIZE = 18;

// États de page hors contenu : vide, erreur, hors ligne.
export default function PageState(props: PageStateProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  if (props.variant === 'offline') {
    return (
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.offline, { borderBottomColor: colors.border }, props.style]}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={OFFLINE_ICON_SIZE}
          color={colors.subtitle}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <AppText variant="callout" tone="subtitle" style={styles.offlineText}>
          {props.text}
        </AppText>
      </View>
    );
  }

  if (props.variant === 'error') {
    return (
      <View style={[styles.centered, props.style]}>
        <Ionicons
          name="alert-circle-outline"
          size={ERROR_ICON_SIZE}
          color={colors.subtitle}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <View style={styles.errorTexts} accessible accessibilityRole="alert">
          <AppText variant="title3" style={styles.centerText}>
            {props.title}
          </AppText>
          <AppText variant="body" tone="subtitle" style={styles.centerText}>
            {props.message}
          </AppText>
        </View>
        <Button variant="secondary" label={props.retryLabel ?? 'Réessayer'} onPress={props.onRetry} />
      </View>
    );
  }

  return (
    <View style={[styles.empty, props.style]}>
      <ValBubble mood={props.mood ?? 'complice'} title={props.title} text={props.text} />
      {props.actionLabel && props.onAction ? (
        <Button variant="primary" label={props.actionLabel} onPress={props.onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderBottomWidth: 1,
  },
  offlineText: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    gap: space[4],
    paddingHorizontal: space[6],
    paddingVertical: space[10],
  },
  errorTexts: {
    alignItems: 'center',
    gap: space[2],
  },
  centerText: {
    textAlign: 'center',
  },
  empty: {
    gap: space[6],
    paddingHorizontal: space[4],
    paddingVertical: space[8],
  },
});
