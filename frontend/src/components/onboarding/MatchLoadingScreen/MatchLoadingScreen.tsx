import { LinearGradient } from 'expo-linear-gradient';
import { Alert, StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthCheck } from '../../../hooks/useAuthCheck';
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
  const { ensureAuthenticated, isAuthenticated } = useAuthCheck();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCancel = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    navigation.navigate('Home');
  }, [navigation]);

  const startGame = React.useCallback(async () => {
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
            onPress: startGame,
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
    // Check if already authenticated, if so start immediately
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(() => {
        navigation.navigate('Game');
      }, 1500); // Shorter delay if already authenticated
    } else {
      // Try to authenticate and then start game
      timeoutRef.current = setTimeout(() => {
        startGame();
      }, 2000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [navigation, isAuthenticated, startGame]);

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
            <Text style={[typography.headingSecondary, styles.title]}>Finding a Player...</Text>
            <Text style={[typography.bodyPrimary, styles.subtitle]}>Please wait a moment.</Text>
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
