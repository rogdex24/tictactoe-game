import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMatchmaking } from '../../../state/MatchmakingContext';
import { usePlayer } from '../../../state/PlayerContext';
import { colors } from '../../../styles/colors';
import { layout, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { TextButton } from '../../common/TextButton';
import { GameBoard, GameSymbol } from '../../game/GameBoard';
import { BackgroundGlow } from '../../home/BackgroundGlow';

export const PlayerGameScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayer();
  const displayName = playerName || 'Player';

  // Use matchmaking context for all match state and actions
  const {
    phase,
    board,
    winningCells,
    currentTurnMark,
    yourMark,
    opponentName,
    opponentConnected,
    isSendingMove,
    sendMove,
    cleanupMatchmaking,
  } = useMatchmaking();

  const handleLeaderboard = useCallback(() => {
    navigation.navigate('Leaderboard');
  }, [navigation]);

  const handleCellPress = useCallback(
    (index: number) => {
      sendMove(index);
    },
    [sendMove],
  );

  const handlePlayAgain = useCallback(() => {
    // For multiplayer, we would need to start a new match
    // For now, just go back to home to restart matchmaking
    navigation.navigate('Home');
  }, [navigation]);

  const handleLeaveGame = useCallback(async () => {
    console.log('🏠 Navigating back to home, stopping matchmaking');
    await cleanupMatchmaking();
    navigation.navigate('Home');
  }, [cleanupMatchmaking, navigation]);

  const boardDisabled =
    phase !== 'playing' ||
    !yourMark ||
    currentTurnMark !== yourMark ||
    isSendingMove ||
    !opponentConnected;

  // Determine the current turn's status message
  const statusMessage = useMemo(() => {
    if (phase === 'complete') {
      // This should be set by the matchmaking context based on the game result
      return 'Game Complete';
    }

    if (phase !== 'playing') {
      return 'Waiting...';
    }

    if (!opponentConnected) {
      return 'Opponent Disconnected';
    }

    if (currentTurnMark === yourMark) {
      return 'Your Turn';
    } else {
      return 'Opponent Turn';
    }
  }, [phase, currentTurnMark, yourMark, opponentConnected]);

  // Determine active symbol for turn indicator
  const activeSymbol = useMemo(() => {
    if (phase === 'complete' && winningCells) {
      // Show the winning symbol
      const winningCell = winningCells[0];
      return board[winningCell] as 'X' | 'O';
    }

    return currentTurnMark || 'X';
  }, [currentTurnMark, phase, winningCells, board]);

  // Determine status color based on game state
  const statusColor = useMemo(() => {
    if (phase === 'complete') {
      // Determine if player won or lost based on winning cells
      if (winningCells) {
        const winningCell = winningCells[0];
        const winningMark = board[winningCell];
        if (winningMark === yourMark) {
          return winningMark === 'X' ? colors.accentMint : colors.accentTealSoft;
        } else {
          return colors.accentDanger;
        }
      } else {
        // It's a draw
        return colors.accentDraw;
      }
    }

    if (!opponentConnected) {
      return colors.accentDanger;
    }

    return currentTurnMark === 'X' ? colors.accentMint : colors.textTealHighlight;
  }, [currentTurnMark, phase, winningCells, board, yourMark, opponentConnected]);

  const isGameComplete = phase === 'complete';

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
              <Text style={[styles.matchupText, styles.matchupName]}>{displayName}</Text>
              <Text style={[styles.matchupText, styles.matchupAffiliation]}> (YOU)</Text>
              <Text style={[styles.matchupText, styles.matchupSeparator]}> vs. </Text>
              <Text style={[styles.matchupText, styles.matchupOpponent]}>
                {opponentName || 'Opponent'}
              </Text>
              <Text style={[styles.matchupText, styles.matchupAffiliation]}> (OPP)</Text>
            </View>
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
