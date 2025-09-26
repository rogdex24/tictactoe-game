import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlayerStore } from '../../../state/usePlayerStore';
import { colors } from '../../../styles/colors';
import { layout, radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { BackgroundGlow } from '../../home/BackgroundGlow';
import { GameBoard } from '../GameBoard';

const cardHeight = Math.min(
  layout.screenHeight * layout.homeCardHeightRatio,
  layout.homeCardMaxHeight,
);

const TurnIcon: React.FC = () => (
  <Svg height={32} viewBox="0 0 100 100" width={32}>
    <Path d="M20 20 L80 80" stroke={colors.accentMint} strokeLinecap="round" strokeWidth={12} />
    <Path d="M80 20 L20 80" stroke={colors.accentMint} strokeLinecap="round" strokeWidth={12} />
  </Svg>
);

export const GameScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayerStore();

  const handleLeaveGame = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const displayName = playerName || 'Player';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.cardWrapper}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.card}
          >
            <BackgroundGlow />
            <View style={styles.cardContent}>
              <View style={styles.header}>
                <Text style={styles.matchupText}>{`${displayName} (YOU) vs. CPU (OPP)`}</Text>
                <Text style={styles.scoreText}>3 - 2</Text>
              </View>
              <View style={styles.body}>
                <View style={styles.turnIndicator}>
                  <Text style={styles.turnLabel}>Your Turn</Text>
                  <TurnIcon />
                </View>
                <GameBoard />
              </View>
              <View style={styles.footer}>
                <CustomButton label="Leave Game" onPress={handleLeaveGame} variant="danger" />
              </View>
            </View>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: layout.homeCardMaxWidth,
    height: cardHeight,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 24 },
    shadowRadius: 60,
    elevation: 24,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  matchupText: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 16,
    letterSpacing: 1.2,
    color: colors.textSecondary,
    textTransform: 'uppercase',
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
    gap: spacing.lg,
  },
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  turnLabel: {
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 24,
    color: colors.accentMint,
  },
  footer: {
    paddingBottom: spacing.md,
  },
});
