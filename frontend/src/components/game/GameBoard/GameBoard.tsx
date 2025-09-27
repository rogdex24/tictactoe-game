import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import React from 'react';

import { colors } from '../../../styles/colors';
import { layout, radius, spacing } from '../../../styles/dimensions';

import { GameSymbol } from './GameSymbol';

type PlayerMark = 'X' | 'O';

const CELL_GAP = spacing.sm;

const createVerticalPath = (x: number) => `M ${x} 5 Q ${x + 1} 50 ${x} 95`;
const createHorizontalPath = (y: number) => `M 5 ${y} Q 50 ${y + 1} 95 ${y}`;

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
  const [boardSize, setBoardSize] = React.useState(0);

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    setBoardSize(event.nativeEvent.layout.width);
  }, []);

  const rowIndices = React.useMemo(() => [0, 1, 2], []);

  const overlayPaths = React.useMemo(() => {
    if (!boardSize) {
      return {
        vertical: [createVerticalPath(33), createVerticalPath(67)],
        horizontal: [createHorizontalPath(33), createHorizontalPath(67)],
      };
    }

    const cellSize = (boardSize - CELL_GAP * 2) / 3;
    const firstDivision = cellSize + CELL_GAP / 2;
    const secondDivision = firstDivision + cellSize + CELL_GAP;

    const toPercent = (value: number) => (value / boardSize) * 100;

    const vertical = [firstDivision, secondDivision].map((x) =>
      createVerticalPath(Number(toPercent(x).toFixed(3))),
    );
    const horizontal = [firstDivision, secondDivision].map((y) =>
      createHorizontalPath(Number(toPercent(y).toFixed(3))),
    );

    return { vertical, horizontal };
  }, [boardSize]);

  return (
    <View onLayout={handleLayout} style={styles.wrapper}>
      <View style={styles.board}>
        {rowIndices.map((row) => (
          <View key={row} style={styles.row}>
            {rowIndices.map((column) => {
              const index = row * 3 + column;
              const value = cells[index];
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
        ))}
      </View>
      <Svg pointerEvents="none" style={styles.gridOverlay} viewBox="0 0 100 100">
        {overlayPaths.vertical.map((path, index) => (
          <Path
            key={`v-${index}`}
            d={path}
            fill="none"
            stroke={colors.borderTealSoft}
            strokeLinecap="round"
            strokeWidth={0.8}
          />
        ))}
        {overlayPaths.horizontal.map((path, index) => (
          <Path
            key={`h-${index}`}
            d={path}
            fill="none"
            stroke={colors.borderTealSoft}
            strokeLinecap="round"
            strokeWidth={0.8}
          />
        ))}
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
    gap: CELL_GAP,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  cell: {
    flex: 1,
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
