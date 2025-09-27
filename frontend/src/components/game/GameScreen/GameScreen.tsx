import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMatch } from '../../../state/MatchContext';
import { usePlayer } from '../../../state/PlayerContext';
import { colors } from '../../../styles/colors';
import { layout, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { TextButton } from '../../common/TextButton';
import { BackgroundGlow } from '../../home/BackgroundGlow';
import { GameBoard, GameSymbol } from '../GameBoard';

export const GameScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName, session } = usePlayer();
  const { matchState, playerMark, opponent, isMyTurn, sendMove, leaveMatch, mode } = useMatch();
  const myUserId = session?.user_id ?? null;

  const board = matchState.board;

  const myProfileName = React.useMemo(() => {
    if (myUserId && matchState.players[myUserId]?.username) {
      return matchState.players[myUserId].username;
    }
    return playerName || 'Player';
  }, [matchState.players, myUserId, playerName]);

  const opponentName = React.useMemo(() => {
    if (opponent?.displayName && opponent.displayName.length > 0) {
      return opponent.displayName;
    }

    if (opponent?.username) {
      return opponent.username;
    }

    return 'Opponent';
  }, [opponent]);

  const handleLeaderboard = useCallback(() => {
    navigation.navigate('Leaderboard');
  }, [navigation]);

  const winningCells = matchState.winningLine;
  const isGameComplete = matchState.phase === 'complete';

  const statusMessage = useMemo(() => {
    if (matchState.phase === 'waiting') {
      return 'Waiting for opponent...';
    }

    if (matchState.phase === 'playing') {
      return isMyTurn ? 'Your Turn' : `${opponentName}'s Turn`;
    }

    if (matchState.phase === 'complete') {
      if (matchState.winner && matchState.winner === myUserId) {
        return 'You Win!';
      }

      if (matchState.winner && matchState.winner !== myUserId) {
        return `${opponentName} Wins!`;
      }

      return "It's a Draw!";
    }

    return 'Connecting to match...';
  }, [isMyTurn, matchState.phase, matchState.winner, myUserId, opponentName]);

  const statusColor = useMemo(() => {
    if (matchState.phase === 'complete') {
      if (matchState.winner && matchState.winner === myUserId) {
        return colors.accentMint;
      }
      if (matchState.winner && matchState.winner !== myUserId) {
        return colors.accentDanger;
      }
      return colors.accentDraw;
    }

    if (matchState.phase === 'playing') {
      return isMyTurn ? colors.accentMint : colors.textTealHighlight;
    }

    return colors.textTealHighlight;
  }, [isMyTurn, matchState.phase, matchState.winner, myUserId]);

  const activeSymbol = useMemo(() => {
    if (matchState.phase === 'complete') {
      if (matchState.winnerMark) {
        return matchState.winnerMark;
      }
      return playerMark ?? opponent?.mark ?? 'X';
    }

    if (matchState.phase === 'playing') {
      const currentPresence = matchState.currentTurn
        ? matchState.players[matchState.currentTurn]
        : undefined;
      return currentPresence?.mark ?? playerMark ?? 'X';
    }

    return playerMark ?? 'X';
  }, [matchState.currentTurn, matchState.phase, matchState.players, matchState.winnerMark, opponent?.mark, playerMark]);

  const boardDisabled = matchState.phase !== 'playing' || !isMyTurn;

  const handleCellPress = useCallback(
    (index: number) => {
      if (boardDisabled || board[index]) {
        return;
      }

      sendMove(index).catch((error) => {
        console.warn('Failed to send move', error);
      });
    },
    [board, boardDisabled, sendMove],
  );

  const handlePlayAgain = useCallback(async () => {
    try {
      await leaveMatch();
    } catch (error) {
      console.warn('Failed to leave match before rematch', error);
    }
    navigation.replace('MatchLoading');
  }, [leaveMatch, navigation]);

  const handleLeaveGame = useCallback(async () => {
    try {
      await leaveMatch();
    } catch (error) {
      console.warn('Failed to leave match', error);
    }
    navigation.navigate('Home');
  }, [leaveMatch, navigation]);

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
          <View style={styles.header}>
            <View style={styles.matchupRow}>
              <Text style={[styles.matchupText, styles.matchupName]}>{myProfileName}</Text>
              <Text style={[styles.matchupText, styles.matchupAffiliation]}> (YOU)</Text>
              <Text style={[styles.matchupText, styles.matchupSeparator]}> vs. </Text>
              <Text style={[styles.matchupText, styles.matchupOpponent]}>{opponentName}</Text>
              <Text style={[styles.matchupText, styles.matchupAffiliation]}> (OPP)</Text>
            </View>
            <Text style={styles.scoreText}>{`Mode: ${(mode ?? 'classic').toUpperCase()}`}</Text>
          </View>
          <View style={styles.body}>
            <View style={styles.turnIndicator}>
              <Text style={[styles.turnLabel, { color: statusColor }]}>{statusMessage}</Text>
              <View style={styles.turnIcon}>
                <GameSymbol mark={activeSymbol} />
              </View>
            </View>
            <GameBoard
              cells={board}
              disabled={boardDisabled}
              onCellPress={handleCellPress}
              winningCells={winningCells}
            />
          </View>
          <View style={styles.footer}>
            {isGameComplete ? (
              <>
                <CustomButton label="Play Again" onPress={handlePlayAgain} />
                <TextButton
                  label="View Leaderboard"
                  onPress={handleLeaderboard}
                  style={styles.leaderboardButton}
                />
              </>
            ) : (
              <CustomButton label="Leave Game" onPress={handleLeaveGame} variant="danger" />
            )}
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
    paddingTop: spacing.hero,
    paddingBottom: spacing.hero,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchupText: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  matchupName: {
    color: colors.textPrimary,
  },
  matchupAffiliation: {
    color: colors.textTealHighlight,
  },
  matchupSeparator: {
    color: colors.textSecondary,
  },
  matchupOpponent: {
    color: colors.textPrimary,
  },
  scoreText: {
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: 6,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  turnLabel: {
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 24,
    color: colors.accentMint,
    marginRight: spacing.sm,
  },
  turnIcon: {
    width: 32,
    height: 32,
  },
  footer: {
    width: '100%',
    paddingTop: spacing.lg,
  },
  leaderboardButton: {
    marginTop: spacing.sm,
  },
});
