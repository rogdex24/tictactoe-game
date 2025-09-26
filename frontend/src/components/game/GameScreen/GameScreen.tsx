import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlayer } from '../../../state/PlayerContext';
import { colors } from '../../../styles/colors';
import { layout, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { BackgroundGlow } from '../../home/BackgroundGlow';
import { GameBoard, GameSymbol } from '../GameBoard';

type PlayerMark = 'X' | 'O';

type GameState = 'PLAYING' | 'WON' | 'DRAW';

const WINNING_COMBINATIONS: Array<[number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const evaluateBoard = (
  cells: (PlayerMark | null)[],
): { winner: PlayerMark | null; line: [number, number, number] | null } => {
  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination;
    const candidate = cells[a];
    if (candidate && candidate === cells[b] && candidate === cells[c]) {
      return { winner: candidate, line: combination };
    }
  }

  return { winner: null, line: null };
};

const isBoardFull = (cells: (PlayerMark | null)[]) => cells.every((cell) => cell !== null);

export const GameScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayer();

  const handleLeaveGame = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const displayName = playerName || 'Player';

  const [board, setBoard] = useState<(PlayerMark | null)[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<PlayerMark>('X');
  const [gameState, setGameState] = useState<GameState>('PLAYING');
  const [statusMessage, setStatusMessage] = useState<string>('Your Turn');
  const [winner, setWinner] = useState<PlayerMark | null>(null);
  const [winningCells, setWinningCells] = useState<number[] | null>(null);

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setGameState('PLAYING');
    setWinner(null);
    setWinningCells(null);
    setStatusMessage('Your Turn');
  }, []);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      setStatusMessage(currentPlayer === 'X' ? 'Your Turn' : 'Opponent Turn');
    }
  }, [currentPlayer, gameState]);

  const handleCellPress = useCallback(
    (index: number) => {
      if (gameState !== 'PLAYING' || board[index]) {
        return;
      }

      const nextBoard = [...board];
      nextBoard[index] = currentPlayer;
      setBoard(nextBoard);

      const { winner: roundWinner, line } = evaluateBoard(nextBoard);

      if (roundWinner) {
        setGameState('WON');
        setWinner(roundWinner);
        setWinningCells(line);
        setStatusMessage(`${roundWinner} Wins!`);
        return;
      }

      if (isBoardFull(nextBoard)) {
        setGameState('DRAW');
        setWinningCells(null);
        setStatusMessage("It's a Draw!");
        return;
      }

      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    },
    [board, currentPlayer, gameState],
  );

  const boardDisabled = gameState !== 'PLAYING';

  const activeSymbol = useMemo<PlayerMark>(() => {
    if (gameState === 'WON' && winner) {
      return winner;
    }

    return currentPlayer;
  }, [currentPlayer, gameState, winner]);

  const statusColor = useMemo(() => {
    if (gameState === 'WON') {
      return winner === 'X' ? colors.accentMint : colors.accentTealSoft;
    }

    if (gameState === 'DRAW') {
      return colors.accentDraw;
    }

    return currentPlayer === 'X' ? colors.accentMint : colors.textTealHighlight;
  }, [currentPlayer, gameState, winner]);

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
              <Text style={[styles.matchupText, styles.matchupOpponent]}>CPU</Text>
              <Text style={[styles.matchupText, styles.matchupAffiliation]}> (OPP)</Text>
            </View>
            <Text style={styles.scoreText}>3 - 2</Text>
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
            <CustomButton label="Leave Game" onPress={handleLeaveGame} variant="danger" />
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
});
