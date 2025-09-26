import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import React from 'react';

import { colors } from '../../../styles/colors';
import { spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';

interface TextButtonProps {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const TextButton: React.FC<TextButtonProps> = ({ label, onPress, style }) => {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.container, style, pressed && styles.pressed]}
    >
      {({ pressed }) => <Text style={[styles.label, pressed && styles.labelPressed]}>{label}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    ...typography.bodyPrimary,
    fontFamily: typography.fontFamilyBold,
    color: colors.textTealSoft,
    textAlign: 'center',
  },
  labelPressed: {
    color: colors.textPrimary,
  },
});
