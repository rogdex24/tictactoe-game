import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import React from 'react';
import LinearGradientComponent from 'react-native-linear-gradient';

import { colors } from '../../../styles/colors';
import { radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { CtaButtonProps } from '../../../types/components';

interface CustomButtonProps extends CtaButtonProps {
  style?: ViewStyle;
}

export const CustomButton: React.FC<CustomButtonProps> = ({ label, onPress, style }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, style, pressed && styles.pressed]}
    >
      {({ pressed }) => (
        <LinearGradientComponent
          colors={
            pressed
              ? [colors.accentCoral, colors.accentCoral]
              : [colors.accentCoral, colors.accentMint]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={styles.label}>{label}</Text>
        </LinearGradientComponent>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.pill,
    shadowColor: colors.shadow,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.2,
  },
  gradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.button,
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
});
