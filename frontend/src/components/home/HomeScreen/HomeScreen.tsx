import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../../styles/colors';
import { layout, offsets, radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { BackgroundGlow } from '../BackgroundGlow';
import { GameIcons } from '../GameIcons';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleStart = () => {
    navigation.navigate('Game');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.cardWrapper}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <BackgroundGlow />
            <View style={styles.cardContent}>
              <View style={styles.header}>
                <Text style={[typography.displayHero, styles.title]}>Tic Tac{'\n'}Toe</Text>
                <Text style={[typography.bodyPrimary, styles.subtitle]}>
                  {"The classic game of X's and O's"}
                </Text>
              </View>
              <View style={styles.iconStage}>
                <GameIcons />
              </View>
              <View style={styles.ctaArea}>
                <CustomButton label="Start Game" onPress={handleStart} />
              </View>
            </View>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </View>
  );
};

const cardHeight = Math.min(
  layout.screenHeight * layout.homeCardHeightRatio,
  layout.homeCardMaxHeight,
);

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
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: spacing.xl,
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
    height: 192,
    marginTop: offsets.homeGraphicLift,
    position: 'relative',
    zIndex: 0,
  },
  ctaArea: {
    paddingBottom: spacing.md,
    zIndex: 1,
  },
});
