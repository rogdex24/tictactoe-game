import { LinearGradient } from 'expo-linear-gradient';
import {
  FlatList,
  ListRenderItem,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { nakamaService } from '../../../services/nakama';
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
  score: number;
  rank: number;
  games: number;
}

interface LeaderboardRecord {
  userId: string;
  username: string;
  score: number;
  rank: number;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    games: number;
  };
}

interface LeaderboardResponse {
  records: LeaderboardRecord[];
}

const LeaderboardRow: React.FC<{ entry: LeaderboardEntry; isCurrentUser?: boolean }> = ({
  entry,
  isCurrentUser = false,
}) => {
  return (
    <View style={[styles.row, isCurrentUser && styles.currentUserRow]}>
      <Text style={[styles.rankCell, isCurrentUser && styles.currentUserText]}>{entry.rank}</Text>
      <Text numberOfLines={1} style={[styles.playerCell, isCurrentUser && styles.currentUserText]}>
        {entry.player}
        {isCurrentUser && <Text style={styles.currentUserIndicator}> (You)</Text>}
      </Text>
      <Text style={styles.recordCell}>
        <Text style={[styles.winText, isCurrentUser && styles.currentUserWinText]}>
          {entry.wins}
        </Text>
        <Text style={[styles.separatorText, isCurrentUser && styles.currentUserText]}>/</Text>
        <Text style={[styles.lossText, isCurrentUser && styles.currentUserLossText]}>
          {entry.losses}
        </Text>
        <Text style={[styles.separatorText, isCurrentUser && styles.currentUserText]}>/</Text>
        <Text style={[styles.drawText, isCurrentUser && styles.currentUserDrawText]}>
          {entry.draws}
        </Text>
      </Text>
      <Text style={[styles.gamesCell, isCurrentUser && styles.currentUserText]}>{entry.games}</Text>
      <Text style={[styles.scoreCell, isCurrentUser && styles.currentUserText]}>{entry.score}</Text>
    </View>
  );
};

export const LeaderboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID from session
    const session = nakamaService.getSession();
    if (session && session.user_id) {
      setCurrentUserId(session.user_id);
    }
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the same RPC call pattern as the working test
      const leaderboardData = (await nakamaService.getLeaderboard(50)) as LeaderboardResponse;

      let leaderboardEntries: LeaderboardEntry[] = [];

      if (leaderboardData && leaderboardData.records && leaderboardData.records.length > 0) {
        leaderboardEntries = leaderboardData.records.map((record: LeaderboardRecord) => {
          const { wins, losses, draws, games } = record.stats || {
            wins: 0,
            losses: 0,
            draws: 0,
            games: 0,
          };

          return {
            id: record.userId || 'unknown',
            player: record.username || 'Unknown Player',
            wins,
            losses,
            draws,
            score: record.score || 0,
            rank: record.rank || 0,
            games,
          };
        });
      }

      setLeaderboardData(leaderboardEntries);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.navigate('Home');
  };

  const handlePlayAgain = () => {
    navigation.navigate('Home');
  };

  const renderItem: ListRenderItem<LeaderboardEntry> = ({ item }) => {
    const isCurrentUser = !!(currentUserId && item.id === currentUserId);
    return <LeaderboardRow entry={item} isCurrentUser={isCurrentUser} />;
  };

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
              <Text style={[styles.headerCell, styles.rankHeader]}>#</Text>
              <Text style={[styles.headerCell, styles.playerHeader]}>PLAYER</Text>
              <Text style={[styles.headerCell, styles.recordHeader]}>W/L/D</Text>
              <Text style={[styles.headerCell, styles.gamesHeader]}>GAMES</Text>
              <Text style={[styles.headerCell, styles.scoreHeader]}>SCORE</Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accentTeal} />
                <Text style={styles.loadingText}>Loading leaderboard...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <CustomButton label="Retry" onPress={loadLeaderboard} style={styles.retryButton} />
              </View>
            ) : leaderboardData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No leaderboard data yet.</Text>
                <Text style={styles.emptySubtext}>Play some matches to see rankings!</Text>
              </View>
            ) : (
              <FlatList
                data={leaderboardData}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
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
    paddingHorizontal: spacing.lg,
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
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 13,
    color: colors.accentTeal,
    textShadowColor: colors.accentTealOverlay,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rankHeader: {
    flex: 1,
    textAlign: 'center',
  },
  playerHeader: {
    flex: 4,
  },
  recordHeader: {
    flex: 3,
    textAlign: 'center',
  },
  timeHeader: {
    flex: 1,
    textAlign: 'center',
  },
  gamesHeader: {
    flex: 1.2,
    textAlign: 'center',
    marginRight: spacing.md,
  },
  scoreHeader: {
    flex: 1.5,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 16,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    color: colors.accentDanger,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    minWidth: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyBold,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 14,
    textAlign: 'center',
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
  rankCell: {
    flex: 1,
    ...typography.bodyPrimary,
    fontFamily: typography.fontFamilyBold,
    textAlign: 'center',
    color: colors.accentTealSoft,
  },
  playerCell: {
    flex: 4,
    ...typography.bodyPrimary,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  recordCell: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    textAlign: 'center' as const,
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyBold,
  },
  gamesCell: {
    flex: 1.2,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.md,
    textAlign: 'center' as const,
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyBold,
  },
  timeCell: {
    flex: 2,
    ...typography.bodyPrimary,
    textAlign: 'center',
    color: colors.textMuted,
  },
  scoreCell: {
    flex: 1.5,
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
  // Current user highlighting styles
  currentUserRow: {
    backgroundColor: colors.accentTealOverlay,
    borderWidth: 1,
    borderColor: colors.accentTealBorder,
    shadowColor: colors.accentTeal,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  currentUserText: {
    color: colors.accentTeal,
    fontFamily: typography.fontFamilyBold,
  },
  currentUserIndicator: {
    color: colors.accentTealSoft,
    fontSize: 11,
    fontFamily: typography.fontFamilyRegular,
    fontStyle: 'italic',
  },
  currentUserWinText: {
    color: colors.accentMint,
    fontFamily: typography.fontFamilyBold,
  },
  currentUserLossText: {
    color: colors.accentDanger,
    fontFamily: typography.fontFamilyBold,
  },
  currentUserDrawText: {
    color: colors.accentDraw,
    fontFamily: typography.fontFamilyBold,
  },
});
