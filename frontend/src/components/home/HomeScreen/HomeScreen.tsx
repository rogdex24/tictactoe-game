import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../../styles/colors';
import { layout, offsets, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { BackgroundGlow } from '../BackgroundGlow';
import { GameIcons } from '../GameIcons';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleStart = () => {
    navigation.navigate('PlayerName');
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.hero,
    paddingBottom: spacing.hero,
    justifyContent: 'space-between',
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
    paddingTop: spacing.hero,
    zIndex: 1,
  },
});
