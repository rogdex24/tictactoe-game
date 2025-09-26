import Svg, { Path } from 'react-native-svg';

import React from 'react';

import { colors } from '../../../styles/colors';

type PlayerMark = 'X' | 'O';

interface GameSymbolProps {
  mark: PlayerMark;
}

export const GameSymbol: React.FC<GameSymbolProps> = ({ mark }) => {
  if (mark === 'X') {
    return (
      <Svg height="100%" viewBox="0 0 100 100" width="100%">
        <Path
          d="M 22 20 C 40 35 65 60 78 80"
          fill="none"
          stroke={colors.accentTealSoft}
          strokeLinecap="round"
          strokeWidth={10}
        />
        <Path
          d="M 78 20 C 65 40 40 65 22 80"
          fill="none"
          stroke={colors.accentMint}
          strokeLinecap="round"
          strokeWidth={10}
        />
      </Svg>
    );
  }

  return (
    <Svg height="100%" viewBox="0 0 100 100" width="100%">
      <Path
        d="M 50 10 C 25 10 10 25 10 50 C 10 75 25 90 50 90 C 75 90 90 75 90 50 C 90 25 75 10 50 10"
        fill="none"
        stroke={colors.textPrimary}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={10}
        transform="rotate(-10 50 50)"
      />
      <Path
        d="M 50 12 C 27 12 12 27 12 50 C 12 73 27 88 50 88 C 73 88 88 73 88 50 C 88 27 73 12 50 12"
        fill="none"
        stroke={colors.textSecondary}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={9}
        transform="rotate(6 50 50)"
      />
    </Svg>
  );
};
