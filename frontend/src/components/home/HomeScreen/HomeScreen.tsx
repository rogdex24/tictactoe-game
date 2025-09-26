import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import LinearGradientComponent from 'react-native-linear-gradient';

import { colors } from '../../../styles/colors';
import { layout, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { GameLogo } from '../../common/GameLogo';
import { BackgroundGlow } from '../BackgroundGlow';
import { GameIcons } from '../GameIcons';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleStart = () => {
    navigation.navigate('Game');
  };

  return (
    <LinearGradientComponent
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <BackgroundGlow />
        <GameIcons />
        <View style={styles.content}>
          <View style={styles.header}>
            <GameLogo />
          </View>
          <View style={styles.body}>
            <Text style={[typography.headingXXL, styles.headline]}>Dominate the grid</Text>
            <Text style={[typography.bodyLarge, styles.subheadline]}>
              Queue up with friends or match instantly against rivals around the globe.
            </Text>
          </View>
          <CustomButton label="Start a match" onPress={handleStart} style={styles.button} />
          <Text style={[typography.bodyLarge, styles.footerText]}>
            Invite friends and climb the leaderboard today.
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradientComponent>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  body: {
    marginBottom: spacing.xl,
  },
  headline: {
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subheadline: {
    color: colors.textSecondary,
  },
  button: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  footerText: {
    color: colors.textSecondary,
  },
});
