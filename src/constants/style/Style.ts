import { CHART_HEIGHT } from "@/src/components/outils/portfolio/chartConstants";
import { StyleSheet } from "react-native";

export type ColorScheme = 'light' | 'dark';

export const palette = {
  // Thème sombre — reprend le fond confirmé du site (#0D0D0F)
  dark: {
    background: '#0D0D0F',
    surface: '#18181C',       // cartes, inputs, panneaux légèrement plus clairs
    surfaceAlt: '#232328',
    text: '#F5F4F2',
    subtitle: '#9A9AA2',
    border: '#2C2C32',
    primary: '#8B5CF6',       // violet — "légendaire", coffres, coach IA
    primaryText: '#FFFFFF',
    gold: '#E8B23D',          // XP, récompenses, coffre légendaire 
    success: '#4ADE80',
    error: '#F26B5E',
  },

  // Thème clair — même identité, inversée pour la lisibilité de jour
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceAlt: '#F0EFF4',
    text: '#0D0D0F',
    subtitle: '#5B5B63',
    border: '#E2E1E6',
    primary: '#7C3AED',
    primaryText: '#FFFFFF',
    gold: '#E8B23D',
    success: '#16A34A',
    error: '#DC4C3E',
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
      fontWeight: '600',
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
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
    },
    backBtn: {
        marginLeft: -20,
    },

  });
}

export function getBoutonStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    button: {
      backgroundColor: colors.gold,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: colors.background,
      fontWeight: '600',
      fontSize: 15,
    },
  });
}

export function getInputStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    link: {
      color: colors.gold,
      textAlign: 'center',
      marginTop: 16,
      fontSize: 13,
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
      fontWeight: '500',
      color: colors.background,
    },
    pillBtn: {
      backgroundColor: colors.gold,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    pillBtnLabel: {
      color: colors.background,
      fontWeight: '600',
      fontSize: 14,
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
      color: colors.background,
      fontSize: 22,
      fontWeight: '700',
    },
    pseudo: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    email: {
      color: colors.subtitle,
      fontSize: 13,
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
      fontWeight: '600',
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
      fontWeight: '700',
    },
    statLabel: {
      color: colors.subtitle,
      fontSize: 12,
      marginTop: 2,
    },
    sectionTitle: {
      color: colors.subtitle,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
    },
    rowLabelDanger: {
      color: colors.error,
      fontSize: 15,
    },
    inlineEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    smallInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.background,
    },
    smallBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    smallBtnText: {
      color: colors.primaryText,
      fontWeight: '600',
      fontSize: 13,
    },
    helperText: {
      color: colors.subtitle,
      fontSize: 12,
      marginTop: 6,
    },
    successText: {
      color: colors.success,
      fontSize: 12,
      marginTop: 6,
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
      color: colors.gold,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
      fontWeight: '600',
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
      fontWeight: '500',
    },
    definition: {
      color: colors.subtitle,
      fontSize: 13,
      marginTop: 6,
      lineHeight: 18,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
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
      fontWeight: '500',
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    excerpt: {
      color: colors.subtitle,
      fontSize: 13,
      lineHeight: 18,
    },
    date: {
      color: colors.subtitle,
      fontSize: 11,
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
      fontWeight: '500',
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
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
    },
    actions: {
      flexDirection: 'row',
      gap: 16,
    },
    body: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 26,
    },
    error: {
      color: colors.error,
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
      fontWeight: '700',
      marginTop: 24,
      marginBottom: 10,
    },
    h3: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginTop: 20,
      marginBottom: 8,
    },
    paragraph: {
      color: colors.text,
      fontSize: 16,
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
      borderLeftColor: colors.primary,
      paddingLeft: 14,
      marginVertical: 16,
    },
    quoteText: {
      color: colors.text,
      fontSize: 17,
      fontStyle: 'italic',
      lineHeight: 24,
    },
    quoteAuthor: {
      color: colors.subtitle,
      fontSize: 13,
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
      lineHeight: 22,
    },
    listItemText: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
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
      fontWeight: '700',
    },
    statLabel: {
      color: colors.subtitle,
      fontSize: 12,
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
      fontWeight: '600',
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
    },
    quizExplanation: {
      color: colors.subtitle,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
    },
      termLink: {
      color: colors.primary,
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
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    error: {
      color: colors.error,
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
    },
    // Header dégradé
    headerWrap: {
      overflow: 'hidden',
    },
    headerGradient: {
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
      shadowColor: '#000',
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
      fontWeight: '800',
      fontSize: 17,
    },
    statPillValueGold: {
      color: colors.gold,
      fontWeight: '800',
      fontSize: 17,
    },
    statPillLabel: {
      color: colors.subtitle,
      fontSize: 12,
      fontWeight: '600',
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
      fontWeight: '800',
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
      marginTop: 10,
      maxWidth: 100,
      textAlign: 'center',
      fontWeight: '400',
    },
    nodeTitleCurrent: {
      color: colors.text,
      fontSize: 12,
      marginTop: 10,
      maxWidth: 100,
      textAlign: 'center',
      fontWeight: '700',
    },
    nodeXpText: {
      color: colors.gold,
      fontSize: 10,
      marginTop: 2,
      fontWeight: '700',
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
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    moduleDifficultyText: {
      color: colors.subtitle,
      fontSize: 12,
      marginTop: 2,
      textTransform: 'capitalize',
    },
    moduleDoneBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: colors.gold + '22',
    },
    moduleDoneBadgeText: {
      fontSize: 11,
      fontWeight: '800',
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
      fontWeight: '700',
      minWidth: 38,
      textAlign: 'right',
    },
        // ContinueCard
    continueCardWrap: {
      marginHorizontal: 20,
      marginBottom: 24,
    },
    continueCardGradient: {
      borderRadius: 20,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    continueCardTextWrap: {
      flex: 1,
    },
    continueCardModule: {
      color: colors.primaryText,
      opacity: 0.85,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 4,
    },
    continueCardLesson: {
      color: colors.primaryText,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    continueCardXp: {
      color: colors.primaryText,
      opacity: 0.85,
      fontSize: 12,
    },
    continueCardPlayWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.22)',
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
      borderLeftColor: colors.primaryText,
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
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    error: {
      color: colors.error,
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
      marginBottom: 4,
    },
    valueCardAmount: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '800',
      marginBottom: 8,
    },
    valueCardGainPositive: {
      color: colors.success,
      fontSize: 14,
      fontWeight: '700',
    },
    valueCardGainNegative: {
      color: colors.error,
      fontSize: 14,
      fontWeight: '700',
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
      marginBottom: 4,
    },
    statCardValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    statCardValuePositive: {
      color: colors.success,
      fontSize: 15,
      fontWeight: '700',
    },
    statCardValueNegative: {
      color: colors.error,
      fontSize: 15,
      fontWeight: '700',
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
      borderColor: colors.primary,
      borderStyle: 'dashed',
      marginBottom: 20,
    },
    addButtonText: {
      color: colors.primary,
      fontWeight: '700',
    },
    // Liste positions
    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 10,
    },
    emptyText: {
      color: colors.subtitle,
      fontSize: 13,
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
      backgroundColor: colors.primary,
    },
    chartRangeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.subtitle,
    },
    chartRangeTextActive: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryText,
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
      fontWeight: '700',
    },
    positionName: {
      color: colors.subtitle,
      fontSize: 11,
    },
    positionDeleteIcon: {
      color: colors.subtitle,
      fontSize: 16,
    },
    positionBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    positionSubline: {
      color: colors.subtitle,
      fontSize: 11,
    },
    positionValueWrap: {
      alignItems: 'flex-end',
    },
    positionValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    positionGainPositive: {
      color: colors.success,
      fontSize: 12,
      fontWeight: '600',
    },
    positionGainNegative: {
      color: colors.error,
      fontSize: 12,
      fontWeight: '600',
    },
    positionDailyPositive: {
      color: colors.success,
      fontSize: 11,
      marginTop: 4,
    },
    positionDailyNegative: {
      color: colors.error,
      fontSize: 11,
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
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    reminderBadge: {
      marginLeft: 'auto',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: colors.gold,
    },
    reminderBadgeText: {
      color: colors.background,
      fontSize: 11,
      fontWeight: '700',
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    error: {
      color: colors.error,
      marginBottom: 16,
    },
    // Bloc "juste atteint"
    achievedCard: {
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.gold + '22',
      borderWidth: 1,
      borderColor: colors.gold,
      marginBottom: 20,
    },
    achievedTitle: {
      color: colors.gold,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 4,
    },
    achievedItemText: {
      color: colors.text,
      fontSize: 13,
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
      fontWeight: '700',
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
      marginBottom: 2,
    },
    reconColValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    reconHint: {
      color: colors.subtitle,
      fontSize: 12,
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
      fontWeight: '600',
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
      fontWeight: '600',
    },
    // Liste objectifs
    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 10,
    },
    emptyText: {
      color: colors.subtitle,
      fontSize: 13,
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
      fontWeight: '700',
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
      backgroundColor: colors.primary,
    },
    goalProgressFillDone: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.gold,
    },
    goalAmountText: {
      color: colors.subtitle,
      fontSize: 12,
    },
    goalDeleteBtn: {
      alignSelf: 'flex-end',
      marginTop: 8,
    },
    goalDeleteText: {
      color: colors.error,
      fontSize: 12,
      fontWeight: '600',
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
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    error: {
      color: colors.error,
      marginBottom: 16,
    },
    periodText: {
      color: colors.subtitle,
      fontSize: 13,
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
      marginBottom: 4,
    },
    restePositive: {
      color: colors.success,
      fontSize: 28,
      fontWeight: '800',
    },
    resteNegative: {
      color: colors.error,
      fontSize: 28,
      fontWeight: '800',
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
      marginBottom: 4,
    },
    summaryPillValue: {
      fontSize: 15,
      fontWeight: '700',
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
      borderColor: colors.primary,
      borderStyle: 'dashed',
      marginBottom: 20,
    },
    addButtonText: {
      color: colors.primary,
      fontWeight: '700',
    },
    emptyText: {
      color: colors.subtitle,
      fontSize: 13,
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
      fontWeight: '700',
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
    },
    breakdownTotalText: {
      color: colors.subtitle,
      fontSize: 12,
      fontWeight: '600',
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
      opacity: 0.5,
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
      fontWeight: '600',
    },
    entryMetaRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 2,
    },
    entryMetaText: {
      color: colors.subtitle,
      fontSize: 11,
    },
    entryAmountRevenu: {
      color: colors.success,
      fontSize: 15,
      fontWeight: '700',
    },
    entryAmountEpargne: {
      color: colors.gold,
      fontSize: 15,
      fontWeight: '700',
    },
    entryAmountDepense: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    entryDeleteBtn: {
      paddingLeft: 4,
    },
    entryDeleteIcon: {
      color: colors.subtitle,
      fontSize: 16,
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
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.subtitle,
    },
    tabTextActive: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryText,
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
      fontWeight: '700',
      marginBottom: 12,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      marginBottom: 10,
    },
    inputHalf: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
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
      borderColor: colors.border,
    },
    chipActive: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    chipTextActive: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryText,
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
      borderColor: colors.border,
    },
    toggleOptionActive: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleOptionText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    toggleOptionTextActive: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryText,
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
      fontWeight: '600',
    },
    submitBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    submitBtnDisabled: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    submitText: {
      color: colors.primaryText,
      fontWeight: '700',
    },
    submitTextDisabled: {
      color: colors.subtitle,
      fontWeight: '700',
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
      borderColor: colors.border,
    },
    iconChipActive: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconChipIcon: {
      fontSize: 13,
    },
    iconChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    iconChipTextActive: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryText,
    },
  });
}