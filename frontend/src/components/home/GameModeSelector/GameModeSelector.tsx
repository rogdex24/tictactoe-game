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
  if (!visible) {
    return null; // Completely hide the component when not visible
  }

  return (
    <View style={styles.gameModeContainer}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  gameModeContainer: {
    marginBottom: 0,
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    width: '50%',
    minHeight: 40,
    paddingBottom: 20, // Extend container to overlap with ONLINE button
    backgroundColor: 'rgba(15, 23, 42, 0.97)', // More opaque version of surfaceOverlay
    borderTopLeftRadius: radius.md, // Back to rectangular design
    borderTopRightRadius: radius.md, // Back to rectangular design
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs, // Change from paddingVertical to paddingTop
    borderWidth: 1,
    borderBottomWidth: 0, // No bottom border for seamless connection
    borderColor: colors.borderTealSoft,
    // Keep minimal shadow for distinction
    shadowColor: colors.accentTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  gameModeOptions: {
    flexDirection: 'column',
    gap: spacing.xs,
    width: '100%', // Use full width of container
    alignItems: 'stretch',
  },
  gameModeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align items to the left
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
