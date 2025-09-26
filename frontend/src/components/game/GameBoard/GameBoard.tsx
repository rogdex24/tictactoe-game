import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import React from 'react';

import { colors } from '../../../styles/colors';
import { layout, radius, spacing } from '../../../styles/dimensions';

import { GameSymbol } from './GameSymbol';

type PlayerMark = 'X' | 'O';

interface GameBoardProps {
  cells: (PlayerMark | null)[];
  onCellPress?: (index: number) => void;
  disabled?: boolean;
  winningCells?: number[] | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  cells,
  onCellPress,
  disabled = false,
  winningCells,
}) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.board}>
        {cells.map((value, index) => {
          const isWinningCell = winningCells?.includes(index) ?? false;

          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              disabled={disabled || Boolean(value)}
              onPress={() => onCellPress?.(index)}
              style={({ pressed }) => [
                styles.cell,
                pressed && !disabled && !value && styles.cellPressed,
                isWinningCell && styles.winningCell,
              ]}
            >
              {value && (
                <View style={styles.symbolContainer}>
                  <GameSymbol mark={value} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Svg pointerEvents="none" style={styles.gridOverlay} viewBox="0 0 100 100">
        <Path
          d="M 33 5 Q 34 50 33 95"
          fill="none"
          stroke={colors.borderTealSoft}
          strokeLinecap="round"
          strokeWidth={0.8}
        />
        <Path
          d="M 67 5 Q 66 50 67 95"
          fill="none"
          stroke={colors.borderTealSoft}
          strokeLinecap="round"
          strokeWidth={0.8}
        />
        <Path
          d="M 5 33 Q 50 34 95 33"
          fill="none"
          stroke={colors.borderTealSoft}
          strokeLinecap="round"
          strokeWidth={0.8}
        />
        <Path
          d="M 5 67 Q 50 66 95 67"
          fill="none"
          stroke={colors.borderTealSoft}
          strokeLinecap="round"
          strokeWidth={0.8}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: layout.boardMaxSize,
    aspectRatio: 1,
    position: 'relative',
  },
  board: {
    flex: 1,
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
  winningCell: {
    backgroundColor: colors.accentTealOverlay,
    borderWidth: 1,
    borderColor: colors.borderTealSoft,
  },
  symbolContainer: {
    width: '76%',
    height: '76%',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
