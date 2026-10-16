import { CHART_HEIGHT } from "@/src/components/outils/portfolio/chartConstants";
import { StyleSheet, TextStyle } from "react-native";

export type ColorScheme = 'light' | 'dark';

// Polices chargées dans app/_layout.tsx. La graisse est portée par la famille :
// ne pas ajouter de fontWeight en plus (iOS retomberait sur la police système).
export const fonts = {
  title: 'Fraunces_500Medium',
  titleItalic: 'Fraunces_500Medium_Italic', // « enfin » de l'écran de bienvenue
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  bodyExtraBold: 'Inter_800ExtraBold',
  // Emphase dans la bulle de Val (**mot**)
  bodyEmphasis: 'Inter_600SemiBold_Italic',
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
    subtitle: 'rgba(242,239,232,0.52)',  // texte atténué
    textFaint: 'rgba(242,239,232,0.26)', // texte faible
    border: 'rgba(255,255,255,0.055)',   // filet de séparation
    controlBorder: 'rgba(255,255,255,0.13)', // bordures de champs et de contrôles
    gold: '#C9A84C',
    goldDeep: '#977E39',                 // tranche du relief sous l'or (bouton, rond en cours)
    goldHalo: 'rgba(201,168,76,0.15)',   // centre des halos dorés (0,15 au plus : discret)
    goldLine: 'rgba(201,168,76,0.25)',   // filet doré discret (bulle de Val)
    goldRing: 'rgba(201,168,76,0.45)',   // anneau autour de la leçon en cours
    goldSoft: 'rgba(201,168,76,0.13)',   // fond de sélection discret
    frost: 'rgba(143,190,224,0.18)',     // jour sauvé par un gel (bleu glacier discret)
    frostInk: '#8FBEE0',                 // flocon du gel de série
    bubble: '#F7F4EE',                   // bulle de Val (ivoire)
    onBubble: '#0D0D0F',                 // texte de la bulle de Val
    onGold: '#0D0D0F',                   // texte posé sur l'or
    success: '#3FA876',
    error: '#E0715F',
    successDeep: '#2B7A55',              // tranche du relief sous le vert (bouton, option juste)
    dangerDeep: '#A9503F',               // tranche du relief sous le rouge
    successSoft: 'rgba(63,168,118,0.13)', // fond teinté d'une option juste
    dangerSoft: 'rgba(224,113,95,0.13)',  // fond teinté d'une option fausse
    successSheet: '#12261C',             // feuille de réponse juste
    dangerSheet: '#2A1715',              // feuille de réponse fausse
    reliefEdge: 'rgba(255,255,255,0.13)', // tranche d'une option en relief
    progressShine: 'rgba(255,255,255,0.35)', // reflet de la barre de progression
    goldGlint: 'rgba(255,236,170,0.8)',  // éclat doré qui parcourt la barre (série d'affilée)
    pathLockedFace: '#2B2F38',           // rond verrouillé du chemin
    pathLockedDeep: '#171A20',           // sa tranche (et celle du bouton flottant)
    pathShine: 'rgba(255,255,255,0.25)', // reflet en haut à gauche des ronds
    ivory: '#F7F4EE',                    // étoile et icônes des ronds, bulle « COMMENCER »
    nodeHighlight: '#FFFFFF',            // reflet radial (dégradé de 35 % à 0)
    nodeShade: '#000000',                // ombre radiale en bas à droite (18 %)
    nodeInnerLight: 'rgba(255,255,255,0.25)', // fine lumière intérieure en haut
    groundShadow: '#000000',             // ombres au sol (ronds, Val, décors)
    pathScrim: 'rgba(0,0,0,0.35)',       // voile sous la carte de leçon
    cardEdge: 'rgba(0,0,0,0.25)',        // tranche du bouton de la carte de leçon
    shadow: '#000000',
    blobLight: '#FFFFFF',                // taches du fond d'écran
    blobDark: '#000000',
    surface2: '#202026',                 // surface pressée, deuxième niveau
    surfaceEdge: '#08080A',              // tranche d'une carte en relief posée sur surface (mot du jour)
    optionFace: '#1D1D23',               // face d'une carte en relief du lecteur (option, carte, ligne)
    optionEdge: '#0E0E11',               // sa tranche
    optionBorder: 'rgba(255,255,255,0.10)', // son filet
    disabledFace: '#2A2A31',             // bouton en relief inactif (gris foncé neutre)
    disabledEdge: '#1F1F25',             // sa tranche
    disabledText: 'rgba(242,239,232,0.38)', // son libellé (ivoire à 38 %)
    panel: 'rgba(255,255,255,0.04)',     // encart posé sur le fond (barres d'une révélation)
    panelStrong: 'rgba(255,255,255,0.05)', // bande de chiffres du profil
    cardSurface: 'rgba(255,255,255,0.03)', // carte de couleur (UniverseCard) : fond
    cardBorder: 'rgba(255,255,255,0.07)',  // son filet
    track: 'rgba(255,255,255,0.08)',       // piste d'une barre de progression sur une carte
    goldPill: 'rgba(201,168,76,0.14)',     // pastille du niveau
    goldTile: 'rgba(201,168,76,0.16)',     // carré d'une icône dorée (carnet)
    goldLight: '#E8C97A',                  // barre du jour (graphique de la semaine)
    barEmpty: '#18181C',                   // barre d'un jour sans leçon
    pileBack: '#18181D',                 // cartes sous la pile du vrai ou faux
    pileBackDeep: '#141418',             // la plus basse
    chatBubble: '#23232A',               // bulle d'un personnage (dialogue)
    streak: '#E08A4A',                   // série de jours : flamme, tuile SÉRIE, « jours d'affilée »
    streakGlow: 'rgba(224,138,74,0.35)', // lueur orange sous la grande flamme
    scrim: 'rgba(0,0,0,0.6)',            // voile sous les feuilles et modales
    focusRing: '#C9A84C',                // = gold
    skeletonShine: 'rgba(255,255,255,0.06)', // reflet des squelettes de chargement
    logoShine: 'rgba(242,239,232,0.35)',   // reflet qui traverse le logo au démarrage
    chart1: '#C9A84C',                   // = gold
    chart2: '#D9D2C3',
    chart3: '#7C9CC4',
    chart4: '#A06E48',
    chart5: '#64646E',
  },

  // Thème clair — même identité, inversée pour la lisibilité de jour
  light: {
    background: '#FAFAFA',
    // Thème clair : fond commun uni (aucun changement)
    surface: '#FFFFFF',
    surfaceAlt: '#F0EFF4',
    text: '#0D0D0F',
    subtitle: '#5B5B63',
    border: '#E2E1E6',
    gold: '#E8B23D',
    success: '#16A34A',
    error: '#DC4C3E',
    successDeep: '#0F7A35',
    dangerDeep: '#A8362B',
    successSoft: 'rgba(22,163,74,0.12)',
    dangerSoft: 'rgba(220,76,62,0.12)',
    successSheet: '#EAF6EE',
    dangerSheet: '#FBECEA',
    reliefEdge: 'rgba(0,0,0,0.13)',
    progressShine: 'rgba(255,255,255,0.5)',
    goldGlint: 'rgba(255,248,220,0.9)',
    pathLockedFace: '#DDDCE2',
    pathLockedDeep: '#BDBCC4',
    pathShine: 'rgba(255,255,255,0.35)',
    ivory: '#F7F4EE',
    nodeHighlight: '#FFFFFF',
    nodeShade: '#000000',
    nodeInnerLight: 'rgba(255,255,255,0.25)',
    groundShadow: '#000000',
    pathScrim: 'rgba(0,0,0,0.25)',
    cardEdge: 'rgba(0,0,0,0.25)',
    // Jetons ajoutés pour suivre la palette sombre (le thème clair n'est pas retravaillé)
    textFaint: 'rgba(13,13,15,0.26)',
    controlBorder: 'rgba(0,0,0,0.13)',
    goldSoft: 'rgba(232,178,61,0.13)',
    frost: 'rgba(74,138,184,0.14)',      // jour sauvé par un gel (bleu glacier discret)
    frostInk: '#4A8AB8',                 // flocon du gel de série
    bubble: '#FFFFFF',                   // bulle de Val (blanche sur le fond clair)
    onBubble: '#0D0D0F',                 // texte de la bulle de Val
    goldDeep: '#B08526',
    goldHalo: 'rgba(232,178,61,0.12)',
    goldLine: 'rgba(232,178,61,0.35)',
    goldRing: 'rgba(232,178,61,0.45)',
    onGold: '#0D0D0F',
    shadow: '#000000',
    blobLight: '#000000',
    blobDark: '#000000',
    surface2: '#ECEBF0',
    surfaceEdge: '#DEDCE3',
    optionFace: '#FFFFFF',
    optionEdge: '#DEDCE3',
    optionBorder: 'rgba(0,0,0,0.10)',
    disabledFace: '#E4E3E8',
    disabledEdge: '#CFCED6',
    disabledText: 'rgba(13,13,15,0.38)',
    panel: 'rgba(0,0,0,0.04)',
    panelStrong: 'rgba(0,0,0,0.05)',
    cardSurface: 'rgba(0,0,0,0.03)',
    cardBorder: 'rgba(0,0,0,0.08)',
    track: 'rgba(0,0,0,0.08)',
    goldPill: 'rgba(201,168,76,0.18)',
    goldTile: 'rgba(201,168,76,0.18)',
    goldLight: '#B8952F',
    barEmpty: '#E4E4E8',
    pileBack: '#EEEDF2',
    pileBackDeep: '#E4E3E8',
    chatBubble: '#ECEBF0',
    streak: '#D9752F',
    streakGlow: 'rgba(217,117,47,0.25)',
    scrim: 'rgba(0,0,0,0.4)',
    focusRing: '#E8B23D',                // = gold
    skeletonShine: 'rgba(0,0,0,0.05)',
    logoShine: 'rgba(255,255,255,0.5)',
    chart1: '#E8B23D',                   // = gold
    chart2: '#8A8272',
    chart3: '#4F74A3',
    chart4: '#A06E48',
    chart5: '#8C8C96',
  },
};

// Couleurs propres à chaque module (chemin, bannière, carte de leçon).
// face : aplat ; deep : tranche du relief ; onFace : texte et icônes posés
// dessus.
// Les leçons terminées sont en or (récompense), pas dans la couleur du module. Quel module prend quelle couleur : moduleColorKey (utils/modulePath).
// L'or reste réservé à l'XP, aux Vals, aux coffres et aux trophées.
export const moduleColors = {
  ardoise: { face: '#7C9CC4', deep: '#4F6B8F', onFace: '#0D0D0F' },
  sarcelle: { face: '#5E9E9A', deep: '#3F6F6C', onFace: '#0D0D0F' },
  cuivre: { face: '#C9855A', deep: '#8E5A39', onFace: '#0D0D0F' },
  ivoire: { face: '#D9D2C3', deep: '#A39C8D', onFace: '#0D0D0F' },
} as const;

export type ModuleColors = (typeof moduleColors)[keyof typeof moduleColors];

// Fond commun (AppBackground), thème sombre : deux halos radiaux par-dessus
// le fond #0D0D0F, puis le grain. Bleu nuit dans le coin propre à l'onglet,
// or dans le coin opposé. reach : rayon où le halo s'éteint, en part de la
// largeur de l'écran (l'or un peu plus court).
// Carte de couleur (UniverseCard) : rayon, liseré gauche (largeur, retrait
// en haut et en bas). Sa lueur qui suit la progression : utils/universeGlow.
export const universeCard = {
  radius: 20,
  bar: 4,
  barInset: 14,
} as const;

// Lueur dorée derrière l'en-tête du profil : or au cœur, diamètre
export const headerGlow = { opacity: 0.16, size: 300 } as const;

// Grain du fond commun : juste assez pour lisser les dégradés des halos
export const backgroundGrain = 0.02;

export const backgroundHalo = {
  night: { color: '#4664AA', opacity: 0.3, reach: 0.78 },
  gold: { color: '#C9A84C', opacity: 0.2, reach: 0.7 },
} as const;

// Une couleur « #RRGGBB » de la palette, avec une opacité (0 à 1)
export function withOpacity(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
}

// Bulle de Val : forme, texte, ombre
export const bubble = {
  radius: 18,
  paddingX: 16,
  paddingY: 12,
  maxWidth: 280,
  fontSize: 17,
  lineHeight: 24,
  tailBase: 16, // largeur de la pointe à sa base
  shadowOpacity: 0.35,
} as const;

// Ombre de la bulle de Val : noire à 35 %, flou moyen, décalée vers le bas
export function bubbleShadow(groundShadow: string) {
  return [{ offsetX: 0, offsetY: 6, blurRadius: 14, color: withOpacity(groundShadow, bubble.shadowOpacity) }];
}

// Ombre douce sous une carte en relief qui flotte (accueil sans compte) :
// noire à 45 %, floue et décalée vers le bas, en plus de la tranche
export function softShadow(groundShadow: string) {
  return [{ offsetX: 0, offsetY: 16, blurRadius: 32, color: withOpacity(groundShadow, 0.45) }];
}

// ---------------------------------------------------------------------------
// Jetons de mise en page (grille de 4 px)
// ---------------------------------------------------------------------------
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const;

// option : réponses de QCM en relief
// card : cartes plates (surface, rayon 16)
export const radius = { sm: 6, md: 12, option: 14, card: 16, lg: 20, pill: 999 } as const;

export const size = {
  tapMin: 44,
  buttonHeight: 52,
  rowMin: 56,
  icon: 24,
  tabBar: 49,
  valSm: 90,
} as const;

export const opacityDisabled = 0.42;
// Élément secondaire estompé (ligne « dim » d'une révélation)
export const opacityDim = 0.52;

// Épaisseur de la tranche sous les éléments en relief (bouton principal,
// rond de la leçon en cours) ; la face s'y enfonce à l'appui.
export const reliefDepth = 4;

// ---------------------------------------------------------------------------
// Mouvement (ms). Toute animation du lecteur de leçon part de ces durées ;
// courbe par défaut : ease-out (constants/motion.ts), ressorts existants
// pour les rebonds. Rien au-delà de max, sauf le défilement d'un chiffre de
// révélation (roll).
// ---------------------------------------------------------------------------
export const motion = {
  tap: 90,          // retour simple : appui, sélection
  state: 150,       // changement d'état (couleur, humeur de Val)
  shake: 200,       // tremblement d'une réponse fausse
  sheet: 250,       // feuille qui monte, élément d'une cascade
  screen: 300,      // passage d'un écran au suivant, avance de la progression
  suspense: 300,    // silence avant la révélation d'un chiffre
  max: 500,
  roll: 1000,       // chiffre de révélation qui défile
  stagger: 40,      // décalage entre deux éléments d'une cascade
  // Attentes (pas des animations)
  reveal: 80,       // une ligne corrigée de plus (ordre), toutes les 80 ms
  typing: 600,      // un personnage « écrit » avant chaque message
  nextCard: 1500,   // la carte suivante du vrai ou faux arrive seule
  chestStep: 450,   // le coffre monte d'une rareté
} as const;

// ---------------------------------------------------------------------------
// Styles de texte. maxFontSizeMultiplier est une prop de <Text>, pas un style :
// chaque variante porte donc son style ET son plafond d'agrandissement.
// Utiliser <AppText variant="..."> (src/components/common/AppText.tsx) qui
// applique les deux. Aucune couleur ici : elle dépend du thème.
// ---------------------------------------------------------------------------
type TextVariant = { style: TextStyle; maxFontSizeMultiplier: number };

export const textVariants = {
  hero: {
    style: {
      fontFamily: fonts.title,
      fontSize: 44,
      lineHeight: 48,
      letterSpacing: -0.97,
      fontVariant: ['tabular-nums'],
    },
    maxFontSizeMultiplier: 1.2,
  },
  title1: {
    style: { fontFamily: fonts.title, fontSize: 30, lineHeight: 36, letterSpacing: titleLetterSpacing(30) },
    maxFontSizeMultiplier: 1.3,
  },
  title2: {
    style: { fontFamily: fonts.title, fontSize: 24, lineHeight: 30, letterSpacing: titleLetterSpacing(24) },
    maxFontSizeMultiplier: 1.3,
  },
  title3: {
    style: { fontFamily: fonts.title, fontSize: 20, lineHeight: 26, letterSpacing: titleLetterSpacing(20) },
    maxFontSizeMultiplier: 1.3,
  },
  body: {
    style: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
    maxFontSizeMultiplier: 1.6,
  },
  bodyMedium: {
    style: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22 },
    maxFontSizeMultiplier: 1.6,
  },
  callout: {
    style: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
    maxFontSizeMultiplier: 1.6,
  },
  caption: {
    style: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
    maxFontSizeMultiplier: 1.4,
  },
  button: {
    style: { fontFamily: fonts.bodySemibold, fontSize: 16, lineHeight: 20 },
    maxFontSizeMultiplier: 1.3,
  },
  tabLabel: {
    style: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 13 },
    maxFontSizeMultiplier: 1.2,
  },
  sectionLabel: {
    style: {
      fontFamily: fonts.bodySemibold,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    maxFontSizeMultiplier: 1.2,
  },
} as const satisfies Record<string, TextVariant>;

export type TextVariantName = keyof typeof textVariants;

export function getBasiquesStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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


export function getArticlesStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    container: {
      flex: 1,
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
export function getPortefeuilleStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    screen: {
      flex: 1,
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
