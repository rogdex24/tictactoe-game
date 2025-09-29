import { LinearGradient } from 'expo-linear-gradient';
import { Alert, StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthCheck } from '../../../hooks/useAuthCheck';
import { useMatchmaking } from '../../../state/MatchmakingContext';
import { usePlayer } from '../../../state/PlayerContext';
import { colors } from '../../../styles/colors';
import { layout, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { MatchStatusCard } from '../../common/MatchStatusCard';
import { BackgroundGlow } from '../../home/BackgroundGlow';

type MatchLoadingScreenProps = NativeStackScreenProps<RootStackParamList, 'MatchLoading'>;

interface MatchLoadingContentPlayerProps {
  // No need for gameMode prop since we get it from context
}

const MatchLoadingContentPlayer: React.FC<MatchLoadingContentPlayerProps> = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayer();
  const { ensureAuthenticated } = useAuthCheck();
  const {
    phase,
    startMatchmaking,
    cleanupMatchmaking,
    resetMatchState,
    currentMatch,
    statusMessage,
    opponentName,
    opponentConnected,
    mode,
    errorMessage,
    isMatchmakingRequested,
  } = useMatchmaking(); // Destructure specific properties

  const handleCancel = React.useCallback(async () => {
    console.log('🚫 User cancelled matchmaking, cleaning up and resetting state');
    await cleanupMatchmaking();
    resetMatchState();
    navigation.navigate('Home');
  }, [navigation, cleanupMatchmaking, resetMatchState]);

  const handleMatchSuccess = React.useCallback(() => {
    // Navigate to PlayerGame when match is ready
    navigation.navigate('PlayerGame');
  }, [navigation]);

  React.useEffect(() => {
    const initializeMatchmaking = async () => {
      console.log('🖼️ MatchLoadingScreen initializing matchmaking...');
      console.log('🖼️ Current matchmaking phase:', phase);
      console.log('🖼️ Matchmaking requested:', isMatchmakingRequested);

      // Only start matchmaking if user explicitly requested it
      if (!isMatchmakingRequested) {
        console.log('⚠️ MatchLoadingScreen: Matchmaking not requested by user, skipping');
        return;
      }

      // Don't start matchmaking if we're already in an active state
      if (phase === 'playing' || phase === 'joining' || phase === 'matching') {
        console.log(
          '⚠️ MatchLoadingScreen: Matchmaking already in progress, skipping initialization',
        );
        return;
      }

      try {
        await ensureAuthenticated();
        console.log('🚀 MatchLoadingScreen: Starting fresh matchmaking...');
        // Use current gameMode from context, don't override it
        await startMatchmaking();
      } catch (error) {
        console.error('Failed to initialize matchmaking:', error);
      }
    };

    // Only initialize if we're in a clean state and matchmaking was requested
    if ((phase === 'connecting' || phase === 'error') && isMatchmakingRequested) {
      initializeMatchmaking();
    } else {
      console.log('🖼️ MatchLoadingScreen: Skipping initialization, current phase:', phase);
    }
  }, [ensureAuthenticated, phase, startMatchmaking, isMatchmakingRequested]);

  // Handle phase changes for player mode - navigate when match is ready
  React.useEffect(() => {
    if (phase === 'playing' && currentMatch) {
      handleMatchSuccess();
    }
  }, [phase, currentMatch, handleMatchSuccess]);

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
            <Text style={[typography.bodyPrimary, styles.greeting]}>
              {`Hi, ${playerName || 'Player'}!`}
            </Text>
            <MatchStatusCard
              phase={phase}
              statusMessage={statusMessage}
              opponentName={opponentName}
              opponentConnected={opponentConnected}
              mode={mode}
              errorMessage={errorMessage}
              showSpinner={true}
            />
          </View>
          <View style={styles.footer}>
            <CustomButton label="Cancel" onPress={handleCancel} variant="danger" />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const MatchLoadingContentBot: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayer();
  const { ensureAuthenticated, isAuthenticated } = useAuthCheck();

  const handleCancel = React.useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const startBotGame = React.useCallback(async () => {
    try {
      // Ensure authentication before starting the game
      await ensureAuthenticated();
      navigation.navigate('Game');
    } catch (error) {
      console.error('Failed to authenticate before game start:', error);
      Alert.alert(
        'Authentication Required',
        'Unable to connect to game servers. Please try again.',
        [
          {
            text: 'Retry',
            onPress: startBotGame,
          },
          {
            text: 'Go Back',
            style: 'cancel',
            onPress: handleCancel,
          },
        ],
      );
    }
  }, [ensureAuthenticated, navigation, handleCancel]);

  React.useEffect(() => {
    // For bot mode, no delay - just authenticate and start immediately
    if (isAuthenticated) {
      navigation.navigate('Game');
    } else {
      startBotGame();
    }
  }, [navigation, isAuthenticated, startBotGame]);

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
            <Text style={[typography.bodyPrimary, styles.greeting]}>
              {`Hi, ${playerName || 'Player'}!`}
            </Text>
            <LoadingSpinner />
            <Text style={[typography.headingSecondary, styles.title]}>Preparing Bot Match...</Text>
            <Text style={[typography.bodyPrimary, styles.subtitle]}>Setting up your game...</Text>
          </View>
          <View style={styles.footer}>
            <CustomButton label="Cancel" onPress={handleCancel} variant="danger" />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export const MatchLoadingScreen: React.FC<MatchLoadingScreenProps> = ({ route }) => {
  const { mode } = route.params; // Only need mode from route params now

  // Use the appropriate content component based on mode
  if (mode === 'player') {
    return <MatchLoadingContentPlayer />;
  }

  // For bot mode, render directly without provider
  return <MatchLoadingContentBot />;
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
