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

const MatchLoadingContentPlayer: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayer();
  const { ensureAuthenticated } = useAuthCheck();
  const matchmakingContext = useMatchmaking(); // Safe to call here since we're in provider context

  const handleCancel = React.useCallback(() => {
    matchmakingContext.cleanupMatchmaking();
    navigation.navigate('Home');
  }, [navigation, matchmakingContext]);

  const handleMatchSuccess = React.useCallback(() => {
    // Navigate to PlayerGame when match is ready
    navigation.navigate('PlayerGame');
  }, [navigation]);

  React.useEffect(() => {
    const initializeMatchmaking = async () => {
      try {
        await ensureAuthenticated();
        await matchmakingContext.startMatchmaking();
      } catch (error) {
        console.error('Failed to initialize matchmaking:', error);
      }
    };

    initializeMatchmaking();
  }, [ensureAuthenticated, matchmakingContext]);

  // Handle phase changes for player mode - navigate when match is ready
  React.useEffect(() => {
    if (matchmakingContext.phase === 'playing' && matchmakingContext.currentMatch) {
      handleMatchSuccess();
    }
  }, [matchmakingContext.phase, matchmakingContext.currentMatch, handleMatchSuccess]);

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
              phase={matchmakingContext.phase}
              statusMessage={matchmakingContext.statusMessage}
              opponentName={matchmakingContext.opponentName}
              opponentConnected={matchmakingContext.opponentConnected}
              mode={matchmakingContext.mode}
              resultLabel={matchmakingContext.resultLabel}
              resultTone={matchmakingContext.resultTone}
              errorMessage={matchmakingContext.errorMessage}
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
  const { mode } = route.params;

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
