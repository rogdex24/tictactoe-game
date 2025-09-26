import { StyleSheet, Text, View } from 'react-native';

import React from 'react';
import LinearGradientComponent from 'react-native-linear-gradient';

import { colors } from '../../../styles/colors';
import { radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';

export const GameLogo: React.FC = () => {
  return (
    <View style={styles.container}>
      <LinearGradientComponent
        colors={[colors.accentSky, colors.accentMint]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.badge}
      >
        <Text style={styles.badgeText}>XO</Text>
      </LinearGradientComponent>
      <View style={styles.textGroup}>
        <Text style={styles.title}>TicTacToe</Text>
        <Text style={styles.subtitle}>Battle with friends in seconds</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  badgeText: {
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 24,
    color: colors.gradientEnd,
    letterSpacing: 1,
  },
  textGroup: {
    marginLeft: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
