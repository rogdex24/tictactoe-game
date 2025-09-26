import { Pressable, StyleSheet, View } from 'react-native';

import React from 'react';

import { colors } from '../../../styles/colors';
import { radius, spacing } from '../../../styles/dimensions';

const EMPTY_BOARD = Array.from({ length: 9 }, () => null);

interface GameBoardProps {
  onCellPress?: (index: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ onCellPress }) => {
  return (
    <View style={styles.board}>
      {EMPTY_BOARD.map((_, index) => (
        <Pressable
          key={index}
          accessibilityRole="button"
          onPress={() => onCellPress?.(index)}
          style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    flexBasis: '31%',
    flexGrow: 1,
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.boardCell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPressed: {
    backgroundColor: colors.boardCellActive,
  },
});
