import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, ListRenderItem, StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../../styles/colors';
import { layout, radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { BackButton } from '../../common/BackButton';
import { CustomButton } from '../../common/CustomButton';
import { BackgroundGlow } from '../../home/BackgroundGlow';

interface LeaderboardEntry {
  id: string;
  player: string;
  wins: number;
  losses: number;
  draws: number;
  averageTime: string;
  score: number;
}

const LEADERBOARD_DATA: LeaderboardEntry[] = [
  {
    id: '1',
    player: 'CyberNinja',
    wins: 15,
    losses: 3,
    draws: 2,
    averageTime: '0:45',
    score: 1500,
  },
  { id: '2', player: 'Alex', wins: 12, losses: 5, draws: 1, averageTime: '0:33', score: 1150 },
  {
    id: '3',
    player: 'PixelPioneer',
    wins: 10,
    losses: 8,
    draws: 4,
    averageTime: '1:12',
    score: 980,
  },
  { id: '4', player: 'DataDuchess', wins: 9, losses: 9, draws: 3, averageTime: '0:58', score: 850 },
  {
    id: '5',
    player: 'GlitchGamer',
    wins: 5,
    losses: 10,
    draws: 5,
    averageTime: '2:05',
    score: 550,
  },
  {
    id: '6',
    player: 'VectorViper',
    wins: 2,
    losses: 15,
    draws: 0,
    averageTime: '1:30',
    score: 200,
  },
];

const LeaderboardRow: React.FC<{ entry: LeaderboardEntry }> = ({ entry }) => {
  return (
    <View style={styles.row}>
      <Text numberOfLines={1} style={styles.playerCell}>
        {entry.player}
      </Text>
      <Text style={styles.recordCell}>
        <Text style={styles.winText}>{entry.wins}</Text>
        <Text style={styles.separatorText}>/</Text>
        <Text style={styles.lossText}>{entry.losses}</Text>
        <Text style={styles.separatorText}>/</Text>
        <Text style={styles.drawText}>{entry.draws}</Text>
      </Text>
      <Text style={styles.timeCell}>{entry.averageTime}</Text>
      <Text style={styles.scoreCell}>{entry.score}</Text>
    </View>
  );
};

export const LeaderboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleBack = () => {
    navigation.navigate('Home');
  };

  const handlePlayAgain = () => {
    navigation.navigate('Home');
  };

  const renderItem: ListRenderItem<LeaderboardEntry> = ({ item }) => (
    <LeaderboardRow entry={item} />
  );

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.screen}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.screenBackground} />
      <BackgroundGlow />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <BackButton onPress={handleBack} />
            <Text style={[typography.headingSecondary, styles.headerTitle]}>Leaderboard</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.tableWrapper}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.playerHeader]}>PLAYER</Text>
              <Text style={[styles.headerCell, styles.recordHeader]}>W/L/D</Text>
              <Text style={[styles.headerCell, styles.timeHeader]}>TIME</Text>
              <Text style={[styles.headerCell, styles.scoreHeader]}>SCORE</Text>
            </View>
            <FlatList
              data={LEADERBOARD_DATA}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
          <View style={styles.footer}>
            <CustomButton label="Play Again" onPress={handlePlayAgain} />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBackground,
    position: 'relative',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.hero,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    flex: 1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  tableWrapper: {
    flex: 1,
    minHeight: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderTealSoft,
  },
  headerCell: {
    ...typography.bodyPrimary,
    fontFamily: typography.fontFamilyBold,
    color: colors.textTealSoft,
  },
  playerHeader: {
    flex: 4,
  },
  recordHeader: {
    flex: 3,
    textAlign: 'center',
  },
  timeHeader: {
    flex: 2,
    textAlign: 'center',
  },
  scoreHeader: {
    flex: 3,
    textAlign: 'right',
  },
  list: {
    marginTop: spacing.sm,
  },
  listContent: {
    paddingRight: spacing.xs,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRow,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  playerCell: {
    flex: 4,
    ...typography.bodyPrimary,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  recordCell: {
    flex: 3,
    ...typography.bodyPrimary,
    fontFamily: typography.fontFamilyBold,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  timeCell: {
    flex: 2,
    ...typography.bodyPrimary,
    textAlign: 'center',
    color: colors.textMuted,
  },
  scoreCell: {
    flex: 3,
    ...typography.bodyPrimary,
    fontFamily: typography.fontFamilyBold,
    textAlign: 'right',
    color: colors.textPrimary,
  },
  winText: {
    color: colors.accentMint,
  },
  lossText: {
    color: colors.accentDanger,
  },
  drawText: {
    color: colors.accentDraw,
  },
  separatorText: {
    color: colors.textMuted,
  },
  footer: {
    width: '100%',
    paddingTop: spacing.lg,
  },
});
