import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlayer } from '../../../state/PlayerContext';
import { colors } from '../../../styles/colors';
import { layout, offsets, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { IconButton } from '../../common/IconButton';
import { TextButton } from '../../common/TextButton';
import { BackgroundGlow } from '../BackgroundGlow';
import { GameIcons } from '../GameIcons';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayer();
  const trimmedName = playerName.trim();
  const hasPlayerName = trimmedName.length > 0;

  const handleStart = () => {
    if (hasPlayerName) {
      navigation.navigate('MatchLoading');
      return;
    }

    navigation.navigate('PlayerName', { nextScreen: 'MatchLoading' });
  };

  const handleLeaderboard = () => {
    navigation.navigate('Leaderboard');
  };

  const handleEditName = () => {
    navigation.navigate('PlayerName', { nextScreen: 'Home' });
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
          <View style={styles.topSection}>
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
              <Text style={[typography.displayHero, styles.title]}>{`Tic Tac\nToe`}</Text>
              <Text style={[typography.bodyPrimary, styles.subtitle]}>
                {"The classic game of X's and O's"}
              </Text>
            </View>
          </View>
          <View style={styles.iconStage}>
            <GameIcons />
          </View>
          <View style={styles.ctaArea}>
            <CustomButton label="Start Game" onPress={handleStart} />
            <TextButton
              label="View Leaderboard"
              onPress={handleLeaderboard}
              style={styles.leaderboardButton}
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const EditIcon: React.FC = () => (
  <Svg height={20} viewBox="0 0 24 24" width={20}>
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
  topSection: {
    width: '100%',
    alignItems: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
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
    width: 36,
    height: 36,
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
  iconStage: {
    width: 192,
    height: 192,
    marginTop: offsets.homeGraphicLift,
    alignSelf: 'center',
    position: 'relative',
    zIndex: 0,
  },
  ctaArea: {
    width: '100%',
    paddingTop: spacing.xl,
    zIndex: 1,
  },
  leaderboardButton: {
    marginTop: spacing.sm,
  },
});
