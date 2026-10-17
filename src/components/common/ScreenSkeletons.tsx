import { StyleSheet, View } from 'react-native';

import { size, space } from '@/src/constants/style/Style';
import Skeleton, { SkeletonGroup } from './Skeleton';

// Squelettes des écrans qui chargeaient avec un simple indicateur : même
// cadre que le contenu qui les remplace (cartes, rangées, lignes), blocs et
// reflet partagés (Skeleton). L'en-tête de l'écran, lui, reste réel.

const ROW_H = 56;

function Rows({ count, height = ROW_H }: { count: number; height?: number }) {
  return (
    <View style={styles.stack}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width="100%" height={height} shape="button" />
      ))}
    </View>
  );
}

function StatRow({ count = 3, height = 64 }: { count?: number; height?: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.cell}>
          <Skeleton width="100%" height={height} shape="button" />
        </View>
      ))}
    </View>
  );
}

// Profil : carte (avatar, pseudo, e-mail, badge) avec ses trois chiffres,
// puis la section Compte
export function ProfileSkeleton() {
  return (
    <SkeletonGroup style={styles.page}>
      <View style={styles.card}>
        <View style={styles.profileHead}>
          <Skeleton width={64} height={64} shape="circle" />
          <View style={styles.lines}>
            <Skeleton width="55%" height={20} />
            <Skeleton width="75%" height={14} />
            <Skeleton width={120} height={22} shape="pill" />
          </View>
        </View>
        <StatRow height={52} />
      </View>
      <Skeleton width={80} height={12} style={styles.section} />
      <Rows count={3} />
    </SkeletonGroup>
  );
}

// Liste des articles : trois cartes (couverture, catégorie, titre, extrait)
export function ArticleListSkeleton() {
  return (
    <SkeletonGroup style={styles.page}>
      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={styles.articleCard}>
          <Skeleton width="100%" height={160} shape="block" />
          <Skeleton width={90} height={22} shape="pill" />
          <Skeleton width="90%" height={18} />
          <Skeleton width="70%" height={18} />
          <Skeleton width="95%" height={14} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

// Article : couverture, catégorie, titre, date, paragraphes
export function ArticleDetailSkeleton() {
  return (
    <SkeletonGroup>
      <Skeleton width="100%" height={220} shape="text" />
      <View style={[styles.page, styles.lines]}>
        <Skeleton width={90} height={22} shape="pill" />
        <Skeleton width="95%" height={26} />
        <Skeleton width="70%" height={26} />
        <Skeleton width={160} height={14} style={styles.section} />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} width={i % 3 === 2 ? '60%' : '100%'} height={16} />
        ))}
      </View>
    </SkeletonGroup>
  );
}

// Portefeuille : valeur, trois chiffres, graphique, bouton, positions
export function PortfolioSkeleton() {
  return (
    <SkeletonGroup style={styles.page}>
      <Skeleton width="100%" height={112} shape="block" />
      <StatRow />
      <Skeleton width="100%" height={200} shape="block" />
      <Skeleton width="100%" height={size.buttonHeight} shape="button" />
      <Skeleton width={90} height={12} style={styles.section} />
      <Rows count={3} />
    </SkeletonGroup>
  );
}

// Cash-flow : mois, reste à vivre, trois totaux, onglets, entrées
export function CashflowSkeleton() {
  return (
    <SkeletonGroup style={styles.page}>
      <Skeleton width={120} height={14} />
      <Skeleton width="100%" height={96} shape="block" />
      <StatRow height={56} />
      <Skeleton width="100%" height={40} shape="pill" />
      <Skeleton width="100%" height={size.buttonHeight} shape="button" />
      <Rows count={4} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    gap: space[4],
  },
  stack: {
    gap: space[3],
  },
  row: {
    flexDirection: 'row',
    gap: space[3],
  },
  cell: {
    flex: 1,
  },
  card: {
    gap: space[4],
  },
  profileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
  lines: {
    flex: 1,
    gap: space[2],
  },
  section: {
    marginTop: space[2],
  },
  articleCard: {
    gap: space[2],
    marginBottom: space[4],
  },
});
