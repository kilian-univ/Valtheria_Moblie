import { CHART_HEIGHT } from "@/src/components/outils/portfolio/chartConstants";
import { StyleSheet, TextStyle } from "react-native";

export type ColorScheme = 'light' | 'dark';

// Polices chargées dans app/_layout.tsx. La graisse est portée par la famille :
// ne pas ajouter de fontWeight en plus (iOS retomberait sur la police système).
export const fonts = {
  title: 'Fraunces_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;

// Titres Fraunces : interlettrage resserré proportionnel à la taille
export const titleLetterSpacing = (fontSize: number) => Math.round(-0.022 * fontSize * 100) / 100;

// Intitulé de section : petites capitales dorées
export function sectionLabel(colors: { gold: string }): TextStyle {
  return {
    color: colors.gold,
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  };
}

export const palette = {
  // Thème sombre — reprend le fond confirmé du site (#0D0D0F)
  dark: {
    background: '#0D0D0F',
    surface: '#18181C',       // cartes, inputs, panneaux légèrement plus clairs
    surfaceAlt: '#232328',
    text: '#F2EFE8',
    subtitle: 'rgba(242,239,232,0.46)',  // texte atténué
    textFaint: 'rgba(242,239,232,0.26)', // texte faible
    border: 'rgba(255,255,255,0.055)',   // filet de séparation
    controlBorder: 'rgba(255,255,255,0.13)', // bordures de champs et de contrôles
    gold: '#C9A84C',
    goldSoft: 'rgba(201,168,76,0.13)',   // fond de sélection discret
    onGold: '#0D0D0F',                   // texte posé sur l'or
    success: '#3FA876',
    error: '#E0715F',
    shadow: '#000000',
    blobLight: '#FFFFFF',                // taches du fond d'écran
    blobDark: '#000000',
  },

  // Thème clair — même identité, inversée pour la lisibilité de jour
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceAlt: '#F0EFF4',
    text: '#0D0D0F',
    subtitle: '#5B5B63',
    border: '#E2E1E6',
    gold: '#E8B23D',
    success: '#16A34A',
    error: '#DC4C3E',
    // Jetons ajoutés pour suivre la palette sombre (le thème clair n'est pas retravaillé)
    textFaint: 'rgba(13,13,15,0.26)',
    controlBorder: 'rgba(0,0,0,0.13)',
    goldSoft: 'rgba(232,178,61,0.13)',
    onGold: '#0D0D0F',
    shadow: '#000000',
    blobLight: '#000000',
    blobDark: '#000000',
  },
};

export function getBasiquesStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 28,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(28),
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: fonts.body,
      color: colors.subtitle,
      marginBottom: 24,
    },
    form: {
      width: '100%',
      gap: 12,
    },
    error: {
      color: colors.error,
      fontSize: 13,
      fontFamily: fonts.body,
    },
    backBtn: {
        marginLeft: -20,
    },
    sectionLabel: sectionLabel(colors),

  });
}

export function getBackgroundStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];
  const isDark = colorScheme === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    blobLight: {
      position: 'absolute',
      borderRadius: 999,
      backgroundColor: colors.blobLight,
      opacity: isDark ? 0.025 : 0.02,
    },
    blobDark: {
      position: 'absolute',
      borderRadius: 999,
      backgroundColor: colors.blobDark,
      opacity: isDark ? 0.18 : 0.03,
    },
  });
}

export function getBoutonStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    button: {
      backgroundColor: colors.gold,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonDisabled: {
      opacity: 0.42,
    },
    buttonText: {
      color: colors.onGold,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
    },
  });
}

export function getInputStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: colors.controlBorder,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fonts.body,
      color: colors.text,
    },
    link: {
      color: colors.gold,
      textAlign: 'center',
      marginTop: 16,
      fontSize: 13,
      fontFamily: fonts.body,
    },
  });
}

export function getHeaderStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },
    side: {
      minWidth: 32,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      padding: 4,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconBtn: {
      padding: 4,
    },
    textBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    textBtnLabel: {
      fontSize: 14,
      fontFamily: fonts.bodyMedium,
      color: colors.background,
    },
    pillBtn: {
      backgroundColor: colors.gold,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
    },
    pillBtnLabel: {
      color: colors.onGold,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
    },
  });
}

export function getProfileStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    scroll: {
      flexGrow: 1,
      backgroundColor: colors.background,
      padding: 20,
      gap: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.onGold,
      fontSize: 22,
      fontFamily: fonts.bodySemibold,
    },
    pseudo: {
      color: colors.text,
      fontSize: 18,
      fontFamily: fonts.bodySemibold,
    },
    email: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      marginTop: 2,
    },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 6,
    },
    badgeText: {
      color: colors.gold,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      color: colors.text,
      fontSize: 18,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
      marginTop: 2,
    },
    sectionTitle: {
      ...sectionLabel(colors),
      marginBottom: 8,
      marginLeft: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowLabel: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.body,
    },
    rowLabelDanger: {
      color: colors.error,
      fontSize: 15,
      fontFamily: fonts.body,
    },
    inlineEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    smallInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      fontFamily: fonts.body,
      color: colors.text,
      backgroundColor: colors.background,
    },
    smallBtn: {
      backgroundColor: colors.gold,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    smallBtnSecondary: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    smallBtnText: {
      color: colors.onGold,
      fontSize: 13,
      fontFamily: fonts.bodySemibold,
    },
    helperText: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
      marginTop: 6,
    },
    successText: {
      color: colors.success,
      fontSize: 12,
      fontFamily: fonts.body,
      marginTop: 6,
    },
    coinIcon: {
      width: 18,
      height: 18,
      marginBottom: 2,
    },
  });
}

export function getDictionaryStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    sectionHeader: {
      backgroundColor: colors.background,
      paddingTop: 20,
      paddingBottom: 8,
    },
    sectionHeaderText: {
      ...sectionLabel(colors),
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    item: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemLast: {
      borderBottomWidth: 0,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    term: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      flex: 1,
    },
    categoryBadge: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginLeft: 8,
    },
    categoryBadgeText: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.bodyMedium,
    },
    definition: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      marginTop: 6,
      lineHeight: 18,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.controlBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: fonts.body,
      color: colors.text,
      backgroundColor: colors.surface,
      marginTop: 12,
      marginBottom: 4,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 60,
      gap: 8,
    },
    emptyText: {
      color: colors.subtitle,
      fontSize: 14,
      fontFamily: fonts.body,
    },
        // Barre de recherche flottante
    searchWrap: {
      position: 'relative',
      justifyContent: 'center',
    },
    searchIcon: {
      position: 'absolute',
      left: 16,
      zIndex: 1,
    },
    searchInputWithIcon: {
      borderWidth: 0,
      borderRadius: 16,
      paddingLeft: 44,
      paddingRight: 40,
      paddingVertical: 14,
      fontSize: 15,
      fontFamily: fonts.body,
      color: colors.text,
      backgroundColor: colors.surface,
      marginTop: 12,
      marginBottom: 4,
      shadowColor: colors.shadow,
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    searchClearBtn: {
      position: 'absolute',
      right: 14,
      padding: 4,
    },
    // En-tête de section, minimal et discret
    sectionHeaderPill: {
      backgroundColor: colors.background,
      paddingTop: 24,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionHeaderLetter: {
      ...sectionLabel(colors),
    },
    sectionHeaderLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    // Carte de terme (remplace la liste à puces plate)
    termCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'transparent',
      shadowColor: colors.shadow,
      shadowOpacity: colorScheme === 'dark' ? 0.25 : 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    termCardOpen: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.gold + '55',
      shadowColor: colors.gold,
      shadowOpacity: colorScheme === 'dark' ? 0.25 : 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    termRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
    },
    termAccentBar: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 2,
      backgroundColor: colors.gold,
      marginRight: -2,
    },
    termInitial: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    termInitialText: {
      color: colors.background,
      fontSize: 16,
      fontFamily: fonts.bodySemibold,
    },
    termContent: {
      flex: 1,
    },
    termHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    termTitleText: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      flex: 1,
    },
    chevronWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryTag: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 8,
    },
    categoryTagText: {
      fontSize: 10.5,
      fontFamily: fonts.bodySemibold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    definitionWrap: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    definitionText: {
      color: colors.subtitle,
      fontSize: 13.5,
      fontFamily: fonts.body,
      lineHeight: 20,
    },
    emptyIconText: {
      fontSize: 36,
      marginBottom: 6,
      opacity: 0.42,
    },
  });
}

export function getArticlesStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      padding: 20,
      gap: 16,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 16,
    },
    cover: {
      width: '100%',
      height: 160,
      backgroundColor: colors.surfaceAlt,
    },
    cardBody: {
      padding: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    categoryBadge: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    categoryBadgeText: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.bodyMedium,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.bodySemibold,
      marginBottom: 4,
    },
    excerpt: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      lineHeight: 18,
    },
    date: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.body,
      marginTop: 8,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 60,
      gap: 8,
    },
    emptyText: {
      color: colors.subtitle,
      fontSize: 14,
      fontFamily: fonts.body,
    },
  });
}

export function getArticleDetailStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingBottom: 40,
    },
    cover: {
      width: '100%',
      height: 220,
      backgroundColor: colors.surfaceAlt,
    },
    content: {
      padding: 20,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 12,
    },
    categoryBadgeText: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.bodyMedium,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(24),
      lineHeight: 30,
      marginBottom: 8,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    date: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
    },
    actions: {
      flexDirection: 'row',
      gap: 16,
    },
    body: {
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.body,
      lineHeight: 26,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      padding: 20,
    },
  });
}

export function getBlockStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    h2: {
      color: colors.text,
      fontSize: 21,
      fontFamily: fonts.bodySemibold,
      marginTop: 24,
      marginBottom: 10,
    },
    h3: {
      color: colors.text,
      fontSize: 18,
      fontFamily: fonts.bodySemibold,
      marginTop: 20,
      marginBottom: 8,
    },
    paragraph: {
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.body,
      lineHeight: 25,
      marginBottom: 14,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 20,
    },
    quoteBlock: {
      borderLeftWidth: 3,
      borderLeftColor: colors.gold,
      paddingLeft: 14,
      marginVertical: 16,
    },
    quoteText: {
      color: colors.text,
      fontSize: 17,
      fontFamily: fonts.body,
      fontStyle: 'italic',
      lineHeight: 24,
    },
    quoteAuthor: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      marginTop: 6,
    },
    calloutBlock: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginVertical: 14,
    },
    calloutText: {
      fontSize: 14,
      fontFamily: fonts.body,
      lineHeight: 21,
    },
    listBlock: {
      marginVertical: 10,
      gap: 8,
    },
    listRow: {
      flexDirection: 'row',
      gap: 8,
    },
    listBullet: {
      color: colors.gold,
      fontSize: 16,
      fontFamily: fonts.body,
      lineHeight: 22,
    },
    listItemText: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.body,
      lineHeight: 22,
    },
    statCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 26,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(26),
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
      textAlign: 'center',
      marginTop: 6,
    },
    twoColumns: {
      flexDirection: 'row',
      gap: 16,
      marginVertical: 10,
    },
    column: {
      flex: 1,
    },
    quizCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 16,
      gap: 10,
    },
    quizQuestion: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      marginBottom: 4,
    },
    quizChoice: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    quizChoiceText: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.body,
    },
    quizExplanation: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      lineHeight: 19,
      marginTop: 4,
    },
      termLink: {
      color: colors.gold,
      fontFamily: fonts.body,
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
    },
  });
}
export function getApprendreStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    scrollContent: {
      paddingTop: 20,
      paddingBottom: 60,
    },
    emptyWrap: {
      alignItems: 'center',
      marginTop: 40,
    },
    emptyText: {
      color: colors.subtitle,
      fontFamily: fonts.body,
    },
    // Header (fond surface uni)
    headerWrap: {
      overflow: 'hidden',
    },
    headerPanel: {
      backgroundColor: colors.surface,
      paddingVertical: 22,
      paddingHorizontal: 20,
    },
    headerDecoCircleGold: {
      position: 'absolute',
      top: -40,
      right: -30,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.gold,
      opacity: 0.12,
    },
    headerDecoCircleBg: {
      position: 'absolute',
      bottom: -50,
      left: -20,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.background,
      opacity: 0.08,
    },
    headerStatsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 14,
    },
    // Module path wrapper
    moduleBlock: {
      marginBottom: 32,
    },
    pathWrap: {
      alignSelf: 'center',
      position: 'relative',
    },
    // StatPill
    statPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 18,
      backgroundColor: colors.background,
      shadowColor: colors.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    statPillIcon: {
      fontSize: 18,
    },
    statPillValue: {
      color: colors.text,
      fontSize: 17,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    statPillValueGold: {
      color: colors.gold,
      fontSize: 17,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    statPillLabel: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
    },
    pathSvg: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
        // LessonNode — bulle "COMMENCER"
    nodeBubble: {
      position: 'absolute',
      top: -46,
      backgroundColor: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    nodeBubbleText: {
      color: colors.background,
      fontSize: 11,
      fontFamily: fonts.bodySemibold,
    },
    nodeBubbleArrow: {
      position: 'absolute',
      bottom: -5,
      left: '50%',
      marginLeft: -5,
      width: 0,
      height: 0,
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 5,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: colors.text,
    },
    // LessonNode — textes sous le bouton
    nodeTitle: {
      color: colors.text,
      fontSize: 12,
      fontFamily: fonts.body,
      marginTop: 10,
      maxWidth: 100,
      textAlign: 'center',
    },
    nodeTitleCurrent: {
      color: colors.text,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      marginTop: 10,
      maxWidth: 100,
      textAlign: 'center',
    },
    nodeXpText: {
      color: colors.gold,
      fontSize: 10,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
      marginTop: 2,
    },
    nodeSpinnerGlyph: {
      fontSize: 18,
    },
        // ModuleCard
    moduleCard: {
      marginHorizontal: 20,
      marginBottom: 30,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      overflow: 'hidden',
    },
    moduleCardBorderDone: {
      borderColor: colors.gold,
    },
    moduleCardBorderActive: {
      borderColor: colors.border,
    },
    moduleAccentBar: {
      height: 4,
    },
    moduleBody: {
      padding: 18,
    },
    moduleHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    moduleIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    moduleIconText: {
      fontSize: 22,
    },
    moduleTitleWrap: {
      flex: 1,
    },
    moduleTitleText: {
      color: colors.text,
      fontSize: 17,
      fontFamily: fonts.bodySemibold,
      letterSpacing: 0.2,
    },
    moduleDifficultyText: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
      marginTop: 2,
      textTransform: 'capitalize',
    },
    moduleDoneBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: colors.goldSoft,
    },
    moduleDoneBadgeText: {
      fontSize: 11,
      fontFamily: fonts.bodySemibold,
      color: colors.gold,
    },
    moduleProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    moduleProgressTrack: {
      flex: 1,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    moduleProgressFill: {
      height: '100%',
      borderRadius: 5,
    },
    moduleProgressCount: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
      minWidth: 38,
      textAlign: 'right',
    },
        // ContinueCard
    continueCardWrap: {
      marginHorizontal: 20,
      marginBottom: 24,
    },
    continueCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    continueCardTextWrap: {
      flex: 1,
    },
    continueCardModule: {
      color: colors.text,
      opacity: 0.85,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      marginBottom: 4,
    },
    continueCardLesson: {
      color: colors.text,
      fontSize: 18,
      fontFamily: fonts.bodySemibold,
      marginBottom: 6,
    },
    continueCardXp: {
      color: colors.text,
      opacity: 0.85,
      fontSize: 12,
      fontFamily: fonts.body,
      fontVariant: ['tabular-nums'],
    },
    continueCardPlayWrap: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    continueCardPlayTriangle: {
      width: 0,
      height: 0,
      marginLeft: 4,
      borderTopWidth: 11,
      borderBottomWidth: 11,
      borderLeftWidth: 18,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: colors.onGold,
    },
  });
}

export function getPortefeuilleStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
    },
    backChevron: {
      color: colors.text,
      fontSize: 20,
      fontFamily: fonts.body,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(18),
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      marginBottom: 16,
    },
    // Carte valeur actuelle
    valueCard: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      alignItems: 'center',
    },
    valueCardLabel: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      marginBottom: 4,
    },
    valueCardAmount: {
      color: colors.text,
      fontSize: 30,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(30),
      fontVariant: ['tabular-nums'],
      marginBottom: 8,
    },
    valueCardGainPositive: {
      color: colors.success,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    valueCardGainNegative: {
      color: colors.error,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    // Rangée de 3 stats
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statCardLabel: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.body,
      marginBottom: 4,
    },
    statCardValue: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    statCardValuePositive: {
      color: colors.success,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    statCardValueNegative: {
      color: colors.error,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    // Bouton "+ Ajouter une position"
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.gold,
      borderStyle: 'dashed',
      marginBottom: 20,
    },
    addButtonText: {
      color: colors.gold,
      fontFamily: fonts.bodySemibold,
    },
    // Liste positions
    sectionTitle: {
      ...sectionLabel(colors),
      marginBottom: 10,
    },
    emptyText: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      fontStyle: 'italic',
    },
        // HistoryChart
    chartCard: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    chartTitle: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
      marginBottom: 10,
    },
    chartStateBox: {
      height: CHART_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chartEmptyText: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
    },
    chartRangeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    chartRangeChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    chartRangeChipActive: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.gold,
    },
    chartRangeText: {
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      color: colors.subtitle,
    },
    chartRangeTextActive: {
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      color: colors.onGold,
    },
        // PositionRow
    positionCard: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    positionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    positionIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    positionIconText: {
      fontSize: 16,
    },
    positionTitleWrap: {
      flex: 1,
    },
    positionTicker: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
    },
    positionName: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.body,
    },
    positionDeleteIcon: {
      color: colors.subtitle,
      fontSize: 16,
      fontFamily: fonts.body,
    },
    positionBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    positionSubline: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.body,
      fontVariant: ['tabular-nums'],
    },
    positionValueWrap: {
      alignItems: 'flex-end',
    },
    positionValue: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    positionGainPositive: {
      color: colors.success,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    positionGainNegative: {
      color: colors.error,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    positionDailyPositive: {
      color: colors.success,
      fontSize: 11,
      fontFamily: fonts.body,
      fontVariant: ['tabular-nums'],
      marginTop: 4,
    },
    positionDailyNegative: {
      color: colors.error,
      fontSize: 11,
      fontFamily: fonts.body,
      fontVariant: ['tabular-nums'],
      marginTop: 4,
    },
  });
}

export function getEpargneStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
    },
    backChevron: {
      color: colors.text,
      fontSize: 20,
      fontFamily: fonts.body,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(18),
    },
    reminderBadge: {
      marginLeft: 'auto',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: colors.gold,
    },
    reminderBadgeText: {
      color: colors.onGold,
      fontSize: 11,
      fontFamily: fonts.bodySemibold,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      marginBottom: 16,
    },
    // Bloc "juste atteint"
    achievedCard: {
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.goldSoft,
      borderWidth: 1,
      borderColor: colors.gold,
      marginBottom: 20,
    },
    achievedTitle: {
      color: colors.gold,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
      marginBottom: 4,
    },
    achievedItemText: {
      color: colors.text,
      fontSize: 13,
      fontFamily: fonts.body,
    },
    // Bloc réconciliation
    reconCard: {
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    reconTitle: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
      marginBottom: 10,
    },
    reconRow: {
      flexDirection: 'row',
      gap: 10,
    },
    reconRowWithGap: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    reconColLabel: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.body,
      marginBottom: 2,
    },
    reconColValue: {
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    reconHint: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
      fontStyle: 'italic',
      marginTop: 4,
    },
    reconAlertError: {
      marginTop: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.error + '22',
    },
    reconAlertErrorText: {
      color: colors.error,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
    },
    reconAlertSuccess: {
      marginTop: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.success + '22',
    },
    reconAlertSuccessText: {
      color: colors.success,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
    },
    // Liste objectifs
    sectionTitle: {
      ...sectionLabel(colors),
      marginBottom: 10,
    },
    emptyText: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      fontStyle: 'italic',
    },
    goalCard: {
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    goalTitle: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      marginBottom: 8,
    },
    goalProgressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.background,
      overflow: 'hidden',
      marginBottom: 6,
    },
    goalProgressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.gold,
    },
    goalProgressFillDone: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.gold,
    },
    goalAmountText: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
      fontVariant: ['tabular-nums'],
    },
    goalDeleteBtn: {
      alignSelf: 'flex-end',
      marginTop: 8,
    },
    goalDeleteText: {
      color: colors.error,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
    },
  });
}

export function getCashflowStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
    },
    backChevron: {
      color: colors.text,
      fontSize: 20,
      fontFamily: fonts.body,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(18),
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      marginBottom: 16,
    },
    periodText: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      marginBottom: 12,
      textTransform: 'capitalize',
    },
    // Carte "Reste à vivre"
    resteCard: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      alignItems: 'center',
    },
    resteLabel: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      marginBottom: 4,
    },
    restePositive: {
      color: colors.success,
      fontSize: 28,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(28),
      fontVariant: ['tabular-nums'],
    },
    resteNegative: {
      color: colors.error,
      fontSize: 28,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(28),
      fontVariant: ['tabular-nums'],
    },
    // Pastilles résumé
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    summaryPill: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    summaryPillLabel: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.body,
      marginBottom: 4,
    },
    summaryPillValue: {
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    // Bouton "+ Ajouter une entrée"
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.gold,
      borderStyle: 'dashed',
      marginBottom: 20,
    },
    addButtonText: {
      color: colors.gold,
      fontFamily: fonts.bodySemibold,
    },
    emptyText: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      fontStyle: 'italic',
      textAlign: 'center',
    },
        // CategoryBreakdown
    breakdownCard: {
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    breakdownTitle: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
      marginBottom: 12,
    },
    breakdownRow: {
      marginBottom: 10,
    },
    breakdownRowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    breakdownCategoryText: {
      color: colors.text,
      fontSize: 12,
      fontFamily: fonts.body,
    },
    breakdownTotalText: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    breakdownTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    breakdownFill: {
      height: '100%',
      borderRadius: 3,
    },
        // EntryRow
    entryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    entryCardInactive: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      opacity: 0.42,
    },
    entryCategoryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    entryTextWrap: {
      flex: 1,
    },
    entryLabel: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
    },
    entryMetaRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 2,
    },
    entryMetaText: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.body,
    },
    entryAmountRevenu: {
      color: colors.success,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    entryAmountEpargne: {
      color: colors.gold,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    entryAmountDepense: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    entryDeleteBtn: {
      paddingLeft: 4,
    },
    entryDeleteIcon: {
      color: colors.subtitle,
      fontSize: 16,
      fontFamily: fonts.body,
    },
        // TypeTabs
    tabsWrap: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
    },
    tabItem: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 9,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    tabItemActive: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 9,
      alignItems: 'center',
      backgroundColor: colors.gold,
    },
    tabText: {
      fontSize: 13,
      fontFamily: fonts.bodySemibold,
      color: colors.subtitle,
    },
    tabTextActive: {
      fontSize: 13,
      fontFamily: fonts.bodySemibold,
      color: colors.onGold,
    },
  });
}

export function getFormStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    title: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
      marginBottom: 12,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontFamily: fonts.body,
      marginBottom: 10,
    },
    inputHalf: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontFamily: fonts.body,
      flex: 1,
      marginBottom: 0,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    suggestionsScroll: {
      marginBottom: 10,
    },
    suggestionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.controlBorder,
    },
    chipActive: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: colors.gold,
      borderWidth: 1,
      borderColor: colors.controlBorder,
    },
    chipText: {
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      color: colors.text,
    },
    chipTextActive: {
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      color: colors.onGold,
    },
    toggleRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    toggleOption: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.controlBorder,
    },
    toggleOptionActive: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: colors.gold,
      borderWidth: 1,
      borderColor: colors.controlBorder,
    },
    toggleOptionText: {
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      color: colors.text,
    },
    toggleOptionTextActive: {
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      color: colors.onGold,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelText: {
      color: colors.subtitle,
      fontFamily: fonts.bodySemibold,
    },
    submitBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.gold,
    },
    submitBtnDisabled: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.gold,
      opacity: 0.42,
    },
    submitText: {
      color: colors.onGold,
      fontFamily: fonts.bodySemibold,
    },
    submitTextDisabled: {
      color: colors.onGold,
      fontFamily: fonts.bodySemibold,
    },
        iconChipScroll: {
      marginBottom: 12,
    },
    iconChipRow: {
      flexDirection: 'row',
      gap: 8,
    },
    iconChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.controlBorder,
    },
    iconChipActive: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.gold,
      borderWidth: 1,
      borderColor: colors.controlBorder,
    },
    iconChipIcon: {
      fontSize: 13,
    },
    iconChipText: {
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      color: colors.text,
    },
    iconChipTextActive: {
      fontSize: 12,
      fontFamily: fonts.bodySemibold,
      color: colors.onGold,
    },
  });
}

export function getSplashStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
    },
    valEmoji: {
      fontSize: 30,
    },
    wordmark: {
      color: colors.text,
      fontSize: 22,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(22),
    },
    tagline: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      marginTop: 4,
    },
    valAvatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      overflow: 'hidden',
    },
    valImage: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    welcomeText: {
      color: colors.text,
      fontSize: 20,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(20),
      textAlign: 'center',
      paddingHorizontal: 32,
      marginBottom: 8,
    },
    welcomeSubtext: {
      color: colors.subtitle,
      fontSize: 14,
      fontFamily: fonts.body,
      textAlign: 'center',
      paddingHorizontal: 40,
      lineHeight: 20,
    },
  });
}

export function getLessonEndStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, alignItems: 'center' },
    valImage: {
      width: 110,
      height: 110,
      borderRadius: 55,
      borderWidth: 2,
      borderColor: colors.gold,
      marginTop: 24,
      marginBottom: 16,
    },
    title: { color: colors.text, fontSize: 24, fontFamily: fonts.title, letterSpacing: titleLetterSpacing(24), marginBottom: 6 },
    subtitle: { color: colors.subtitle, fontSize: 14, fontFamily: fonts.body, textAlign: 'center', marginBottom: 24 },
    statsRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginBottom: 16 },
    statTile: {
      flex: 1,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    statValue: { color: colors.text, fontSize: 20, fontFamily: fonts.title, letterSpacing: titleLetterSpacing(20), fontVariant: ['tabular-nums'] },
    statValueGold: { color: colors.gold, fontSize: 20, fontFamily: fonts.title, letterSpacing: titleLetterSpacing(20), fontVariant: ['tabular-nums'] },
    statLabel: { color: colors.subtitle, fontSize: 11, fontFamily: fonts.body, marginTop: 4 },
    banner: {
      alignSelf: 'stretch',
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.goldSoft,
      borderWidth: 1,
      borderColor: colors.gold,
      marginBottom: 16,
    },
    bannerText: { color: colors.gold, fontSize: 14, fontFamily: fonts.bodySemibold, textAlign: 'center' },
    card: {
      alignSelf: 'stretch',
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    cardTitle: { color: colors.text, fontSize: 14, fontFamily: fonts.bodySemibold, marginBottom: 10 },
    notionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 6,
    },
    notionName: { color: colors.text, fontSize: 13, fontFamily: fonts.body, flex: 1 },
    badgeDone: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.success + '22' },
    badgeSeen: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.surfaceAlt },
    badgeDoneText: { color: colors.success, fontSize: 11, fontFamily: fonts.bodySemibold },
    badgeSeenText: { color: colors.subtitle, fontSize: 11, fontFamily: fonts.bodySemibold },
  });
}

export function getLessonPlayerStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    centered: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centeredPadded: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    errorText: {
      color: colors.error,
      fontFamily: fonts.body,
      textAlign: 'center',
      marginBottom: 16,
    },
    backLink: {
      color: colors.gold,
      fontFamily: fonts.bodySemibold,
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    closeIcon: {
      color: colors.text,
      fontSize: 20,
      fontFamily: fonts.body,
    },
    progressTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.gold,
    },
  });
}

export function getDocumentStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    scrollContent: {
      paddingBottom: 24,
    },
    question: {
      color: colors.text,
      fontSize: 17,
      fontFamily: fonts.bodySemibold,
      marginHorizontal: 20,
      marginBottom: 16,
    },
    card: {
      marginHorizontal: 20,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    etablissement: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
      letterSpacing: 0.5,
    },
    metaText: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.body,
      marginTop: 2,
    },
    colHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingTop: 14,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 6,
    },
    colHeaderText: {
      color: colors.subtitle,
      fontSize: 10.5,
      fontFamily: fonts.bodySemibold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    colDate: { width: 44 },
    colLabel: { flex: 1 },
    colAmount: { width: 84, textAlign: 'right' },
    // Lignes : même bordure partout, seule la couleur change
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    lineSelected: {
      backgroundColor: colors.goldSoft,
      borderColor: colors.gold,
    },
    lineCorrect: {
      backgroundColor: colors.success + '22',
      borderColor: colors.success,
    },
    lineWrong: {
      backgroundColor: colors.error + '22',
      borderColor: colors.error,
    },
    lineMissed: {
      borderColor: colors.success,
      borderStyle: 'dashed',
    },
    lineWrap: {
      marginBottom: 4,
    },
    dateText: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
      fontVariant: ['tabular-nums'],
      width: 44,
    },
    labelWrap: {
      flex: 1,
      paddingRight: 8,
    },
    labelText: {
      color: colors.text,
      fontSize: 12.5,
      fontFamily: fonts.bodySemibold,
    },
    subLabelText: {
      color: colors.subtitle,
      fontSize: 10.5,
      fontFamily: fonts.body,
      marginTop: 1,
    },
    amountNegative: {
      color: colors.text,
      fontSize: 13,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
      width: 84,
      textAlign: 'right',
    },
    amountPositive: {
      color: colors.success,
      fontSize: 13,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
      width: 84,
      textAlign: 'right',
    },
    revelationBox: {
      marginTop: 4,
      marginBottom: 6,
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.gold + '1F',
      borderWidth: 1,
      borderColor: colors.gold + '55',
    },
    revelationText: {
      color: colors.text,
      fontSize: 12.5,
      fontFamily: fonts.body,
      lineHeight: 18,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 12,
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerLabel: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
    },
    footerValue: {
      color: colors.text,
      fontSize: 12.5,
      fontFamily: fonts.bodySemibold,
      fontVariant: ['tabular-nums'],
    },
    aVenirText: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.body,
      marginTop: 6,
    },
    explanationBox: {
      marginHorizontal: 20,
      marginTop: 8,
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    explanationText: {
      color: colors.subtitle,
      fontSize: 14,
      fontFamily: fonts.body,
      lineHeight: 20,
    },
  });
}

export function getSliderStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    wrap: { flex: 1, paddingBottom: 24 },
    question: {
      color: colors.text,
      fontSize: 17,
      fontFamily: fonts.bodySemibold,
      marginHorizontal: 20,
      marginBottom: 28,
      lineHeight: 23,
    },
    valueWrap: { alignItems: 'center', marginBottom: 28 },
    valueText: { color: colors.gold, fontSize: 44, fontFamily: fonts.title, letterSpacing: titleLetterSpacing(44), fontVariant: ['tabular-nums'] },
    unitText: { color: colors.subtitle, fontSize: 14, fontFamily: fonts.body, marginTop: 2 },
    trackOuter: {
      marginHorizontal: 24,
      height: 40,
      justifyContent: 'center',
    },
    trackBg: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    trackFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.gold,
    },
    thumb: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.gold,
      borderWidth: 3,
      borderColor: colors.background,
      top: 6,
      marginLeft: -14,
    },
    boundsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 24,
      marginTop: 6,
    },
    boundText: { color: colors.subtitle, fontSize: 11, fontFamily: fonts.body, fontVariant: ['tabular-nums'] },
  });
} 