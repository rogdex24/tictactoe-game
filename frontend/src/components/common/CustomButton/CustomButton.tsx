import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import React from 'react';

import { colors } from '../../../styles/colors';
import { radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { CtaButtonProps } from '../../../types/components';

type ButtonVariant = 'primary' | 'secondary';

interface CustomButtonProps extends CtaButtonProps {
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  label,
  onPress,
  style,
  variant = 'primary',
}) => {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        style,
        pressed && (variant === 'primary' ? styles.primaryPressed : styles.secondaryPressed),
      ]}
    >
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  primary: {
    backgroundColor: colors.accentCoral,
    shadowColor: colors.buttonShadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  primaryPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  label: {
    ...typography.buttonPrimary,
    color: colors.gradientStart,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accentCoralBorder,
  },
  secondaryPressed: {
    backgroundColor: colors.accentCoralOverlay,
  },
  secondaryLabel: {
    color: colors.accentCoralSoft,
  },
});
