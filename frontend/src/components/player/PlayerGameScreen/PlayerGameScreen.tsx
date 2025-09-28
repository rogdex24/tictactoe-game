import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';

import type {
  Match,
  MatchData,
  MatchmakerMatched,
  MatchmakerTicket,
  Socket,
} from '@heroiclabs/nakama-js';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { nakamaService } from '../../../services/nakama';
import { usePlayer } from '../../../state/PlayerContext';
import { colors } from '../../../styles/colors';
import { layout, radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { TextButton } from '../../common/TextButton';
import { GameBoard, GameSymbol } from '../../game/GameBoard';
import { BackgroundGlow } from '../../home/BackgroundGlow';

const MATCH_MODE_CLASSIC = 'classic';
const MATCHMAKER_QUERY = '+mode:classic';
const MATCH_OPCODE_STATE = 1;
const MATCH_OPCODE_MOVE = 2;
const MATCH_OPCODE_ERROR = 3;

const createEmptyBoard = (): (PlayerMark | null)[] => Array(9).fill(null);

type PlayerMark = 'X' | 'O';

type MatchPhase = 'connecting' | 'matching' | 'joining' | 'playing' | 'complete' | 'error';

type ResultTone = 'win' | 'loss' | 'draw' | 'forfeit';

type ServerPlayer = {
  userId: string;
  username: string;
  mark: PlayerMark;
  connected: boolean;
};

type ServerMatchState = {
  board?: string[];
  currentMark?: string;
  mode?: string;
  players?: ServerPlayer[];
  isComplete?: boolean;
  winnerMark?: string;
  winnerUserId?: string;
  winningCells?: number[];
  result?: string;
};

type ErrorPayload = {
  message?: string;
};

const decodeMatchData = (data: Uint8Array | string): string => {
  if (typeof data === 'string') {
    return data;
  }

  if (typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder().decode(data);
    } catch (error) {
      console.warn('Failed to decode payload with TextDecoder', error);
    }
  }

  let result = '';
  for (let index = 0; index < data.length; index += 1) {
    result += String.fromCharCode(data[index]);
  }
  return result;
};

const toneToColor = (tone: ResultTone | null): string | undefined => {
  switch (tone) {
    case 'win':
      return colors.accentTealSoft;
    case 'loss':
      return colors.accentDangerText;
    case 'draw':
      return colors.accentDraw;
    case 'forfeit':
      return colors.accentSun;
    default:
      return undefined;
  }
};

export const PlayerGameScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayer();
  const displayName = playerName.trim().length > 0 ? playerName.trim() : 'Player';

  const [phase, setPhase] = React.useState<MatchPhase>('connecting');
  const [statusMessage, setStatusMessage] = React.useState('Connecting to matchmaking...');
  const [board, setBoard] = React.useState<(PlayerMark | null)[]>(createEmptyBoard);
  const [winningCells, setWinningCells] = React.useState<number[] | null>(null);
  const [currentTurnMark, setCurrentTurnMark] = React.useState<PlayerMark | null>(null);
  const [yourMark, setYourMark] = React.useState<PlayerMark | null>(null);
  const [opponentName, setOpponentName] = React.useState<string | null>(null);
  const [opponentConnected, setOpponentConnected] = React.useState(false);
  const [mode, setMode] = React.useState(MATCH_MODE_CLASSIC);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [resultLabel, setResultLabel] = React.useState<string | null>(null);
  const [resultTone, setResultTone] = React.useState<ResultTone | null>(null);
  const [isSendingMove, setIsSendingMove] = React.useState(false);

  const socketRef = React.useRef<Socket | null>(null);
  const ticketRef = React.useRef<MatchmakerTicket | null>(null);
  const matchRef = React.useRef<Match | null>(null);
  const cleanupHandlersRef = React.useRef<(() => void) | null>(null);
  const isMountedRef = React.useRef(false);
  const selfUserIdRef = React.useRef<string | null>(null);

  const resetBoard = React.useCallback(() => {
    setBoard(createEmptyBoard());
    setWinningCells(null);
    setCurrentTurnMark(null);
    setYourMark(null);
    setResultLabel(null);
    setResultTone(null);
    setIsSendingMove(false);
  }, []);

  const cleanupMatchmaking = React.useCallback(async () => {
    const socket = socketRef.current;
    const ticket = ticketRef.current;
    const match = matchRef.current;

    ticketRef.current = null;
    matchRef.current = null;
    selfUserIdRef.current = null;
    setOpponentName(null);
    setOpponentConnected(false);
    setYourMark(null);

    if (ticket && socket) {
      try {
        await socket.removeMatchmaker(ticket.ticket);
      } catch (error) {
        console.warn('Failed to remove matchmaking ticket', error);
      }
    }

    if (match && socket) {
      try {
        await socket.leaveMatch(match.match_id);
      } catch (error) {
        console.warn('Failed to leave match', error);
      }
    }
  }, []);

  const handleMatchError = React.useCallback((message: MatchData) => {
    const decoded = decodeMatchData(message.data);

    try {
      const payload = JSON.parse(decoded) as ErrorPayload;
      setErrorMessage(payload.message ?? 'Something went wrong.');
    } catch (error) {
      console.warn('Failed to parse match error payload', error);
      setErrorMessage('Something went wrong.');
    }

    setIsSendingMove(false);
  }, []);

  const handleMatchState = React.useCallback((payload: ServerMatchState) => {
    const incomingBoard = payload.board ?? [];
    const nextBoard = Array.from({ length: 9 }, (_, index) => {
      const value = incomingBoard[index];
      return value === 'X' || value === 'O' ? value : null;
    }) as (PlayerMark | null)[];

    setBoard(nextBoard);
    setWinningCells(payload.winningCells ?? null);

    const normalizedCurrentMark =
      payload.currentMark === 'X' || payload.currentMark === 'O' ? payload.currentMark : null;
    setCurrentTurnMark(normalizedCurrentMark);

    const players = payload.players ?? [];
    const selfUserId = selfUserIdRef.current;
    const myAssignment = players.find((player) => player.userId === selfUserId) ?? null;
    const opponent = players.find((player) => player.userId !== selfUserId) ?? null;

    setMode(payload.mode && payload.mode.length > 0 ? payload.mode : MATCH_MODE_CLASSIC);
    setYourMark(myAssignment?.mark ?? null);
    setOpponentName(opponent?.username ?? null);
    setOpponentConnected(opponent?.connected ?? false);
    setIsSendingMove(false);
    setErrorMessage(null);

    if (payload.isComplete) {
      setPhase('complete');

      const isWinner = payload.winnerUserId && payload.winnerUserId === selfUserId;
      const winnerMark =
        payload.winnerMark === 'X' || payload.winnerMark === 'O' ? payload.winnerMark : null;
      const outcome = payload.result ?? (winnerMark ? 'win' : 'draw');

      if (outcome === 'draw') {
        setStatusMessage('The match ended in a draw.');
        setResultLabel('Draw');
        setResultTone('draw');
      } else if (outcome === 'forfeit') {
        if (isWinner) {
          setStatusMessage('Opponent forfeited the match. You win!');
          setResultLabel('Victory (Forfeit)');
          setResultTone('forfeit');
        } else {
          setStatusMessage('You left the match.');
          setResultLabel('Forfeit');
          setResultTone('loss');
        }
      } else if (isWinner) {
        setStatusMessage('You won the match!');
        setResultLabel('Victory');
        setResultTone('win');
      } else if (winnerMark) {
        setStatusMessage('Your opponent won the match.');
        setResultLabel('Defeat');
        setResultTone('loss');
      } else {
        setStatusMessage('Match complete.');
        setResultLabel('Complete');
        setResultTone(null);
      }
    } else {
      setPhase('playing');
      setResultLabel(null);
      setResultTone(null);

      if (!opponent || !opponent.connected) {
        setStatusMessage('Waiting for an opponent to connect...');
      } else if (myAssignment?.mark && normalizedCurrentMark === myAssignment.mark) {
        setStatusMessage('Your turn to play.');
      } else {
        const opponentLabel = opponent.username?.trim().length ? opponent.username : 'opponent';
        setStatusMessage(`Waiting for ${opponentLabel} to move...`);
      }
    }
  }, []);

  const handleMatchData = React.useCallback(
    (message: MatchData) => {
      const decoded = decodeMatchData(message.data);

      try {
        const payload = JSON.parse(decoded) as ServerMatchState;
        handleMatchState(payload);
      } catch (error) {
        console.warn('Failed to parse match state payload', error);
      }
    },
    [handleMatchState],
  );

  const handleMatchFound = React.useCallback(
    async (socket: Socket, matched: MatchmakerMatched) => {
      if (!isMountedRef.current) {
        return;
      }

      ticketRef.current = null;

      try {
        setPhase('joining');
        setStatusMessage('Opponent found! Joining match...');
        setErrorMessage(null);

        const match = await socket.joinMatch(matched.match_id);
        if (!isMountedRef.current) {
          try {
            await socket.leaveMatch(match.match_id);
          } catch (error) {
            console.warn('Failed to leave match after unmount', error);
          }
          return;
        }

        matchRef.current = match;
        selfUserIdRef.current = match.self.user_id;

        const opponentPresence = match.presences.find(
          (presence) => presence.user_id !== match.self.user_id,
        );
        setOpponentName(opponentPresence?.username ?? null);
        setOpponentConnected(Boolean(opponentPresence));

        resetBoard();
        setPhase('playing');
        setStatusMessage('Match connected. Waiting for the first move...');
      } catch (error) {
        console.error('Failed to join authoritative match', error);
        setPhase('error');
        setErrorMessage('Failed to join the match. Please try again.');
        await cleanupMatchmaking();
      }
    },
    [cleanupMatchmaking, resetBoard],
  );

  const attachSocketHandlers = React.useCallback(
    (socket: Socket) => {
      const previousMatchmaker = socket.onmatchmakermatched;
      const previousMatchData = socket.onmatchdata;
      const previousDisconnect = socket.ondisconnect;

      socket.onmatchmakermatched = async (matched) => {
        if (ticketRef.current && matched.ticket === ticketRef.current.ticket) {
          await handleMatchFound(socket, matched);
        }

        if (previousMatchmaker) {
          previousMatchmaker(matched);
        }
      };

      socket.onmatchdata = (message) => {
        if (matchRef.current && message.match_id === matchRef.current.match_id) {
          if (message.op_code === MATCH_OPCODE_STATE) {
            handleMatchData(message);
          } else if (message.op_code === MATCH_OPCODE_ERROR) {
            handleMatchError(message);
          }
        }

        if (previousMatchData) {
          previousMatchData(message);
        }
      };

      socket.ondisconnect = (event) => {
        if (previousDisconnect) {
          previousDisconnect(event);
        }

        if (isMountedRef.current) {
          setPhase('error');
          setStatusMessage('Disconnected from the server.');
          setErrorMessage('Connection lost. Please try again.');
        }
      };

      cleanupHandlersRef.current = () => {
        socket.onmatchmakermatched = previousMatchmaker;
        socket.onmatchdata = previousMatchData;
        socket.ondisconnect = previousDisconnect;
      };
    },
    [handleMatchData, handleMatchError, handleMatchFound],
  );

  const startMatchmaking = React.useCallback(async () => {
    cleanupHandlersRef.current?.();
    cleanupHandlersRef.current = null;

    await cleanupMatchmaking();

    try {
      setPhase('connecting');
      setStatusMessage('Connecting to matchmaking...');
      setErrorMessage(null);
      resetBoard();

      const socket = await nakamaService.connectSocket();
      if (!isMountedRef.current) {
        return;
      }

      socketRef.current = socket;
      attachSocketHandlers(socket);

      setPhase('matching');
      setStatusMessage('Searching for an opponent...');

      const ticket = await socket.addMatchmaker(MATCHMAKER_QUERY, 2, 2, {
        mode: MATCH_MODE_CLASSIC,
      });
      if (!isMountedRef.current) {
        try {
          await socket.removeMatchmaker(ticket.ticket);
        } catch (error) {
          console.warn('Failed to remove matchmaking ticket after unmount', error);
        }
        return;
      }

      ticketRef.current = ticket;
    } catch (error) {
      console.error('Failed to start matchmaking', error);
      setPhase('error');
      setErrorMessage('Unable to connect to matchmaking. Please try again.');
    }
  }, [attachSocketHandlers, cleanupMatchmaking, resetBoard]);

  React.useEffect(() => {
    isMountedRef.current = true;
    startMatchmaking();

    return () => {
      isMountedRef.current = false;
      cleanupHandlersRef.current?.();
      cleanupHandlersRef.current = null;
      cleanupMatchmaking().catch((error) => {
        console.warn('Failed to clean up matchmaking on unmount', error);
      });
    };
  }, [cleanupMatchmaking, startMatchmaking]);

  const handleCellPress = React.useCallback(
    (index: number) => {
      if (
        phase !== 'playing' ||
        !socketRef.current ||
        !matchRef.current ||
        !yourMark ||
        currentTurnMark !== yourMark ||
        isSendingMove ||
        board[index] !== null ||
        !opponentConnected
      ) {
        return;
      }

      setIsSendingMove(true);
      setErrorMessage(null);

      const payload = JSON.stringify({ index });

      socketRef.current
        .sendMatchState(matchRef.current.match_id, MATCH_OPCODE_MOVE, payload)
        .catch((error) => {
          console.error('Failed to submit move', error);
          setErrorMessage('Failed to submit move. Please try again.');
          setIsSendingMove(false);
        });
    },
    [board, currentTurnMark, isSendingMove, opponentConnected, phase, yourMark],
  );

  const handlePrimaryAction = React.useCallback(async () => {
    await cleanupMatchmaking();
    navigation.navigate('Home');
  }, [cleanupMatchmaking, navigation]);

  const handleRetry = React.useCallback(() => {
    startMatchmaking();
  }, [startMatchmaking]);

  const isLoadingPhase = phase === 'connecting' || phase === 'matching' || phase === 'joining';

  const primaryButtonLabel = React.useMemo(() => {
    if (phase === 'complete') {
      return 'Back to Home';
    }
    if (phase === 'playing') {
      return 'Leave Match';
    }
    if (phase === 'error') {
      return 'Back to Home';
    }
    return 'Cancel Search';
  }, [phase]);

  const resultColor = toneToColor(resultTone);

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
            <Text style={[typography.headingSecondary, styles.title]}>Multiplayer Match</Text>
            <Text style={[typography.bodyPrimary, styles.subtitle]}>
              Server-authoritative Tic-Tac-Toe. We will pair you with another player and keep the
              board in sync.
            </Text>
            <Text style={[typography.bodyPrimary, styles.playerTag]}>
              Signed in as {displayName}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={[typography.bodyPrimary, styles.statusLabel]}>Match status</Text>
              {isLoadingPhase && <ActivityIndicator color={colors.accentTeal} size="small" />}
            </View>
            <Text style={[typography.bodyPrimary, styles.statusMessage]}>{statusMessage}</Text>

            <View style={styles.statusMetaRow}>
              <View style={styles.metaItem}>
                <Text style={[typography.bodyPrimary, styles.metaLabel]}>Your mark</Text>
                <View style={styles.metaValueMark}>
                  {yourMark ? (
                    <GameSymbol mark={yourMark} />
                  ) : (
                    <Text style={[typography.bodyPrimary, styles.metaPlaceholder]}>—</Text>
                  )}
                </View>
              </View>
              <View style={styles.metaItem}>
                <Text style={[typography.bodyPrimary, styles.metaLabel]}>Opponent</Text>
                <Text style={[typography.bodyPrimary, styles.metaValueText]}>
                  {opponentName ?? (phase === 'matching' ? 'Searching…' : 'Waiting…')}
                </Text>
                <Text style={[typography.bodyPrimary, styles.metaSubLabel]}>
                  {opponentConnected ? 'Connected' : 'Offline'}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[typography.bodyPrimary, styles.metaLabel]}>Mode</Text>
                <Text style={[typography.bodyPrimary, styles.metaValueText]}>
                  {mode === MATCH_MODE_CLASSIC ? 'Classic' : mode}
                </Text>
              </View>
            </View>

            {resultLabel && (
              <Text
                style={[
                  typography.bodyPrimary,
                  styles.resultLabel,
                  resultColor && { color: resultColor },
                ]}
              >
                {resultLabel}
              </Text>
            )}

            {errorMessage && (
              <Text style={[typography.bodyPrimary, styles.errorText]}>{errorMessage}</Text>
            )}
          </View>

          <View style={styles.boardSection}>
            <GameBoard
              cells={board}
              disabled={
                phase !== 'playing' ||
                !yourMark ||
                currentTurnMark !== yourMark ||
                isSendingMove ||
                !opponentConnected
              }
              onCellPress={handleCellPress}
              winningCells={winningCells}
            />
            <Text style={[typography.bodyPrimary, styles.boardHint]}>
              Moves are validated on the server. Take your turn when your mark is highlighted.
            </Text>
          </View>

          <View style={styles.footer}>
            <CustomButton label={primaryButtonLabel} onPress={handlePrimaryAction} />
            {phase === 'error' && (
              <TextButton
                label="Retry Matchmaking"
                onPress={handleRetry}
                style={styles.retryButton}
              />
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
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textTealSoft,
    textAlign: 'center',
  },
  playerTag: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyBold,
  },
  statusCard: {
    width: '100%',
    backgroundColor: colors.surfaceOverlay,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderTealSoft,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
  statusMessage: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 22,
    lineHeight: 30,
  },
  statusMetaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
    gap: spacing.xs,
  },
  metaLabel: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  metaSubLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metaValueText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyBold,
    fontSize: 18,
  },
  metaValueMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaPlaceholder: {
    color: colors.textMuted,
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
  },
  resultLabel: {
    textAlign: 'center',
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 24,
    lineHeight: 30,
  },
  errorText: {
    color: colors.accentDangerText,
    textAlign: 'center',
    fontFamily: typography.fontFamilyBold,
  },
  boardSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  boardHint: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    gap: spacing.sm,
  },
  retryButton: {
    alignSelf: 'center',
  },
});
