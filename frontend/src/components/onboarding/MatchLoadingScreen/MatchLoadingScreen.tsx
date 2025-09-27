import { LinearGradient } from 'expo-linear-gradient';
import { Alert, StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthCheck } from '../../../hooks/useAuthCheck';
import { useMatch } from '../../../state/MatchContext';
import { usePlayer } from '../../../state/PlayerContext';
import { colors } from '../../../styles/colors';
import { layout, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { BackgroundGlow } from '../../home/BackgroundGlow';

export const MatchLoadingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayer();
  const { ensureAuthenticated } = useAuthCheck();
  const { beginMatchmaking, cancelMatchmaking, leaveMatch, status, error, matchId, matchState } =
    useMatch();

  const [hasPromptedError, setHasPromptedError] = React.useState(false);
  const matchmakingAttemptRef = React.useRef<Promise<void> | null>(null);

  const startMatchmaking = React.useCallback(async () => {
    if (matchmakingAttemptRef.current) {
      console.debug(
        'MatchLoadingScreen: matchmaking attempt already running, ignoring new request',
      );
      return matchmakingAttemptRef.current;
    }

    const attempt = (async () => {
      try {
        console.debug('MatchLoadingScreen: ensuring authentication before matchmaking');
        await ensureAuthenticated();
        console.debug('MatchLoadingScreen: authentication ready, beginning matchmaking');
        await beginMatchmaking('classic');
      } catch (authError) {
        console.error('Failed to authenticate before matchmaking:', authError);
        Alert.alert(
          'Authentication Required',
          'Unable to connect to game servers. Please try again.',
          [
            {
              text: 'Retry',
              onPress: () => {
                matchmakingAttemptRef.current = null;
                startMatchmaking();
              },
            },
            {
              text: 'Go Back',
              style: 'cancel',
              onPress: () => navigation.navigate('Home'),
            },
          ],
        );
      }
    })();

    matchmakingAttemptRef.current = attempt;
    try {
      await attempt;
    } finally {
      matchmakingAttemptRef.current = null;
    }

    return attempt;
  }, [beginMatchmaking, ensureAuthenticated, navigation]);

  React.useEffect(() => {
    if (status === 'idle') {
      startMatchmaking();
    }

    return () => {
      matchmakingAttemptRef.current = null;
      cancelMatchmaking().catch((cancelError) => {
        console.warn('Failed to cancel matchmaking on cleanup', cancelError);
      });
    };
  }, [cancelMatchmaking, startMatchmaking, status]);

  React.useEffect(() => {
    if (status === 'error' && error && !hasPromptedError) {
      setHasPromptedError(true);
      Alert.alert('Matchmaking Failed', error, [
        {
          text: 'Retry',
          onPress: () => {
            setHasPromptedError(false);
            startMatchmaking();
          },
        },
        {
          text: 'Go Back',
          style: 'cancel',
          onPress: () => navigation.navigate('Home'),
        },
      ]);
    }
  }, [error, hasPromptedError, navigation, startMatchmaking, status]);

  React.useEffect(() => {
    if (matchId && matchState.phase === 'playing') {
      navigation.replace('Game');
    }
  }, [matchId, matchState.phase, navigation]);

  const handleCancel = React.useCallback(() => {
    matchmakingAttemptRef.current = null;
    Promise.all([cancelMatchmaking(), leaveMatch()]).finally(() => {
      navigation.navigate('Home');
    });
  }, [cancelMatchmaking, leaveMatch, navigation]);

  const statusMessage = React.useMemo(() => {
    switch (status) {
      case 'searching':
        return 'Searching for an opponent...';
      case 'matched':
        return 'Match found! Preparing arena...';
      case 'joining':
        return 'Joining the match...';
      case 'ready':
        return matchState.phase === 'playing'
          ? 'Match ready! Launching game...'
          : 'Waiting for players to join...';
      case 'error':
        return 'Unable to start matchmaking.';
      default:
        return 'Preparing matchmaking...';
    }
  }, [matchState.phase, status]);

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
          <View style={styles.body}>
            <Text
              style={[typography.bodyPrimary, styles.greeting]}
            >{`Hi, ${playerName || 'Player'}!`}</Text>
            <LoadingSpinner />
            <Text style={[typography.headingSecondary, styles.title]}>{statusMessage}</Text>
            <Text style={[typography.bodyPrimary, styles.subtitle]}>
              {status === 'error'
                ? 'We could not start a match. Try again in a moment.'
                : 'This may take a few seconds.'}
            </Text>
          </View>
          <View style={styles.footer}>
            <CustomButton label="Cancel" onPress={handleCancel} variant="danger" />
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
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  greeting: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textTealSoft,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  footer: {
    width: '100%',
    paddingTop: spacing.lg,
  },
});
