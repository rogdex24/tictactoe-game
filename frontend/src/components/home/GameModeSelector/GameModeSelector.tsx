import { Pressable, StyleSheet, Text, View } from 'react-native';

import React from 'react';

import { colors } from '../../../styles/colors';
import { radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { GameMode } from '../../../types/game';
import { GAME_MODES } from '../../../types/game';

interface GameModeSelectorProps {
  selectedGameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  visible?: boolean;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  selectedGameMode,
  onGameModeChange,
  visible = true,
}) => {
  return (
    <View style={styles.gameModeContainer}>
      {visible && (
        <View style={styles.gameModeOptions}>
          <Pressable
            accessibilityLabel="Play classic mode"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selectedGameMode === GAME_MODES.CLASSIC }}
            onPress={() => onGameModeChange(GAME_MODES.CLASSIC)}
            style={[
              styles.gameModeOption,
              selectedGameMode === GAME_MODES.CLASSIC && styles.gameModeOptionActive,
            ]}
          >
            <View
              style={[
                styles.checkbox,
                selectedGameMode === GAME_MODES.CLASSIC && styles.checkboxActive,
              ]}
            />
            <Text style={[typography.bodyPrimary, styles.gameModeText]}>Classic</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Play blitz mode"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selectedGameMode === GAME_MODES.BLITZ }}
            onPress={() => onGameModeChange(GAME_MODES.BLITZ)}
            style={[
              styles.gameModeOption,
              selectedGameMode === GAME_MODES.BLITZ && styles.gameModeOptionActive,
            ]}
          >
            <View
              style={[
                styles.checkbox,
                selectedGameMode === GAME_MODES.BLITZ && styles.checkboxActive,
              ]}
            />
            <Text style={[typography.bodyPrimary, styles.gameModeText]}>Blitz</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  gameModeContainer: {
    marginBottom: spacing.lg,
    alignItems: 'flex-end',
    width: '100%',
    minHeight: 44, // Reserve space even when not visible
  },
  gameModeOptions: {
    flexDirection: 'column',
    gap: spacing.xs,
    width: '50%',
    alignItems: 'stretch',
  },
  gameModeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    gap: spacing.xs,
  },
  gameModeOptionActive: {
    backgroundColor: colors.accentTealOverlay,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.borderTealSoft,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    backgroundColor: colors.accentTeal,
    borderColor: colors.accentTeal,
  },
  gameModeText: {
    color: colors.textPrimary,
  },
});
