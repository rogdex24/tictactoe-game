import { LinearGradient } from 'expo-linear-gradient';
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthCheck } from '../../../hooks/useAuthCheck';
import { useMatchmaking } from '../../../state/MatchmakingContext';
import { usePlayer } from '../../../state/PlayerContext';
import { colors } from '../../../styles/colors';
import { layout, radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { IconButton } from '../../common/IconButton';
import { TextButton } from '../../common/TextButton';
import { BackgroundGlow } from '../BackgroundGlow';
import { GameIcons } from '../GameIcons';
import { GameModeSelector } from '../GameModeSelector';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayer();
  const { ensureAuthenticated, isAuthLoading } = useAuthCheck();
  const { requestMatchmaking, gameMode, setGameMode } = useMatchmaking();
  const { height: screenHeight } = useWindowDimensions();

  const trimmedName = playerName.trim();
  const hasPlayerName = trimmedName.length > 0;
  const [selectedMode, setSelectedMode] = useState<'bot' | 'player'>('bot');
  const isBotMode = selectedMode === 'bot';
  const isVerySmallScreen = screenHeight < 700;

  // Calculate responsive dimensions based on screen height
  const responsiveDimensions = useMemo(() => {
    // For screens < 700px, use tighter spacing; otherwise use comfortable spacing
    const isSmallScreen = screenHeight < 700;

    return {
      topPadding: Math.max(screenHeight * 0.025, 16), // 2.5% min 16px
      bottomPadding: Math.max(screenHeight * 0.02, 12), // 2% min 12px
      iconSize: Math.max(screenHeight * 0.18, 120), // 18% min 120px
      iconLift: Math.max(screenHeight * -0.04, -30), // -4% max -30px
      sectionGap: isSmallScreen ? spacing.md : spacing.lg, // 16px or 24px
      ctaTopGap: Math.max(screenHeight * 0.02, 12), // 2% min 12px
    };
  }, [screenHeight]);

  const handleStart = async () => {
    if (!hasPlayerName) {
      if (isBotMode) {
        navigation.navigate('PlayerName', { nextScreen: 'MatchLoading', mode: 'bot', gameMode });
      } else {
        navigation.navigate('PlayerName', { nextScreen: 'MatchLoading', mode: 'player', gameMode });
      }
      return;
    }

    if (isBotMode) {
      try {
        await ensureAuthenticated();
        console.log('✅ OFFLINE mode: Authentication successful');
      } catch (error) {
        console.log('⚠️ OFFLINE mode: Authentication failed, proceeding anyway:', error);
      }
      navigation.navigate('MatchLoading', { mode: 'bot', gameMode });
    } else {
      try {
        await ensureAuthenticated();
        requestMatchmaking(gameMode);
        navigation.navigate('MatchLoading', { mode: 'player', gameMode });
      } catch (error) {
        Alert.alert(
          'Online Play Authentication Required',
          'Unable to authenticate for online play. Please check your connection and try again.',
          [
            {
              text: 'Retry',
              onPress: handleStart,
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ],
        );
      }
    }
  };

  const handleLeaderboard = () => {
    navigation.navigate('Leaderboard');
  };

  const handleEditName = () => {
    navigation.navigate('PlayerName', { nextScreen: 'Home' });
  };

  const dynamicStyles = StyleSheet.create({
    content: {
      flex: 1,
      width: '100%',
      maxWidth: layout.maxContentWidth,
      alignSelf: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: responsiveDimensions.topPadding,
      paddingBottom: responsiveDimensions.bottomPadding + 90, // add approx button block height!
    },
    topSection: {
      width: '100%',
      alignItems: 'center',
      marginBottom: responsiveDimensions.sectionGap,
    },
    iconStage: {
      width: responsiveDimensions.iconSize,
      height: responsiveDimensions.iconSize,
      maxHeight: screenHeight * 0.18, // add!
      marginTop: responsiveDimensions.iconLift,
      marginBottom: responsiveDimensions.sectionGap,
      alignSelf: 'center',
      position: 'relative',
      zIndex: 0,
    },
    ctaArea: {
      width: '100%',
      paddingTop: responsiveDimensions.ctaTopGap,
      paddingBottom: responsiveDimensions.bottomPadding,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent',
      zIndex: 10,
    },
  });

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
        <View style={dynamicStyles.content}>
          <View style={dynamicStyles.topSection}>
            {hasPlayerName && (
              <View style={styles.greetingRow}>
                <Text style={[typography.bodyPrimary, styles.greetingIntro]}>Hi,</Text>
                <Text style={[typography.bodyPrimary, styles.greetingName]}>{trimmedName}</Text>
                <IconButton
                  accessibilityLabel="Edit name"
                  icon={<EditIcon />}
                  onPress={handleEditName}
                  style={styles.editButton}
                />
              </View>
            )}
            <View style={styles.header}>
              <Text
                style={[
                  typography.displayHero,
                  styles.title,
                  isVerySmallScreen && { fontSize: 60, lineHeight: 62 }, // override if <700px
                ]}
              >
                {`Tic Tac\nToe`}
              </Text>
              <Text style={[typography.bodyPrimary, styles.subtitle]}>
                {"The classic game of X's and O's"}
              </Text>
            </View>
          </View>

          <View style={dynamicStyles.iconStage}>
            <GameIcons small={isVerySmallScreen} />
          </View>

          <View style={dynamicStyles.ctaArea}>
            {/* GameModeSelector with absolute positioning to prevent layout shift */}
            <View style={styles.gameModeOverlay}>
              <GameModeSelector
                selectedGameMode={gameMode}
                onGameModeChange={setGameMode}
                visible={!isBotMode}
              />
            </View>

            <View style={styles.modeToggleContainer}>
              <View style={styles.modeToggle}>
                <Pressable
                  accessibilityLabel="Play offline against the bot"
                  accessibilityRole="button"
                  accessibilityState={{ selected: isBotMode }}
                  onPress={() => setSelectedMode('bot')}
                  style={({ pressed }) => [
                    styles.modeOption,
                    isBotMode && styles.modeOptionActive,
                    pressed && styles.modeOptionPressed,
                  ]}
                >
                  <Text
                    style={[
                      typography.buttonPrimary,
                      styles.modeOptionText,
                      isBotMode && styles.modeOptionTextActive,
                    ]}
                  >
                    OFFLINE
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Play online against other players"
                  accessibilityRole="button"
                  accessibilityState={{ selected: !isBotMode }}
                  onPress={() => setSelectedMode('player')}
                  style={({ pressed }) => [
                    styles.modeOption,
                    !isBotMode && styles.modeOptionActive,
                    pressed && styles.modeOptionPressed,
                  ]}
                >
                  <Text
                    style={[
                      typography.buttonPrimary,
                      styles.modeOptionText,
                      !isBotMode && styles.modeOptionTextActive,
                    ]}
                  >
                    ONLINE
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <CustomButton
                label={isAuthLoading ? 'Connecting...' : 'Start Game'}
                onPress={handleStart}
                disabled={isAuthLoading}
              />
              <TextButton
                label="View Leaderboard"
                onPress={handleLeaderboard}
                style={styles.leaderboardButton}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const EditIcon: React.FC = () => (
  <Svg height={18} viewBox="0 0 24 24" width={18}>
    <Path
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm18-11.49a1 1 0 0 0 0-1.41l-1.59-1.59a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.08-1.08Z"
      fill={colors.textTealSoft}
    />
  </Svg>
);

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
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  greetingIntro: {
    color: colors.textSecondary,
    marginRight: spacing.xs / 2,
  },
  greetingName: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyBold,
  },
  editButton: {
    marginLeft: spacing.xs,
    width: 28,
    height: 28,
  },
  header: {
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: colors.textTealSoft,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  gameModeOverlay: {
    position: 'absolute',
    top: -96, // Fine-tune to eliminate visual gap
    right: 0,
    left: 0,
    // zIndex: 10,
  },
  modeToggleContainer: {
    marginBottom: spacing.xs,
  },
  modeToggleLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.85)', // More opaque version of surfaceOverlay
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    zIndex: 5, // Ensure it's above the GameModeSelector
    position: 'relative',
    opacity: 1, // Ensure completely opaque
  },
  modeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.85)', // More opaque version of surfaceOverlay
    opacity: 1,
    zIndex: 10, // Higher than container
  },
  modeOptionPressed: {
    backgroundColor: colors.borderTealSoft,
  },
  modeOptionActive: {
    backgroundColor: colors.accentTealOverlay,
    borderWidth: 1,
    borderColor: colors.accentTealBorder,
    shadowColor: colors.accentTeal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    // Make ONLINE button completely opaque to hide overlapping GameModeSelector
    opacity: 1,
    zIndex: 10, // Higher than container
  },
  modeOptionText: {
    color: colors.textSecondary,
  },
  modeOptionTextActive: {
    color: colors.textPrimary,
  },
  leaderboardButton: {
    marginTop: spacing.sm,
  },
});
