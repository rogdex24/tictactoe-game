import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import React from 'react';

import { colors } from '../../../styles/colors';
import { radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { CtaButtonProps } from '../../../types/components';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

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
        variant === 'primary'
          ? styles.primary
          : variant === 'secondary'
            ? styles.secondary
            : styles.danger,
        style,
        pressed &&
          (variant === 'primary'
            ? styles.primaryPressed
            : variant === 'secondary'
              ? styles.secondaryPressed
              : styles.dangerPressed),
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'secondary' && styles.secondaryLabel,
          variant === 'danger' && styles.dangerLabel,
        ]}
      >
        {label}
      </Text>
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
    backgroundColor: colors.accentTeal,
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
    borderColor: colors.accentTealBorder,
  },
  secondaryPressed: {
    backgroundColor: colors.accentTealOverlay,
  },
  secondaryLabel: {
    color: colors.accentTealSoft,
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accentDangerBorder,
  },
  dangerPressed: {
    backgroundColor: colors.accentDangerOverlay,
  },
  dangerLabel: {
    color: colors.accentDangerText,
  },
});
