import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import React from 'react';

import { colors } from '../../../styles/colors';
import { radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import { getDisplayName, isValidGameMode } from '../../../types/game';

type MatchPhase = 'connecting' | 'matching' | 'joining' | 'playing' | 'complete' | 'error';
type ResultTone = 'win' | 'loss' | 'draw' | 'forfeit';

interface MatchStatusCardProps {
  phase: MatchPhase;
  statusMessage: string;
  opponentName?: string | null;
  opponentConnected?: boolean;
  mode?: string;
  resultLabel?: string | null;
  resultTone?: ResultTone | null;
  errorMessage?: string | null;
  showSpinner?: boolean;
}

const toneToColor = (tone: ResultTone | null): string | undefined => {
  switch (tone) {
    case 'win':
      return colors.accentMint;
    case 'loss':
      return colors.accentDangerText;
    case 'draw':
      return colors.accentDraw;
    case 'forfeit':
      return colors.textMuted;
    default:
      return undefined;
  }
};

export const MatchStatusCard: React.FC<MatchStatusCardProps> = ({
  phase,
  statusMessage,
  opponentName,
  opponentConnected = false,
  mode = 'Classic',
  resultLabel,
  resultTone,
  errorMessage,
  showSpinner = true,
}) => {
  // Log mode display information for debugging
  React.useEffect(() => {
    console.log('📊 MatchStatusCard render:', {
      phase,
      mode,
      statusMessage,
      opponentName,
      opponentConnected,
      resultLabel,
      resultTone,
    });
  }, [phase, mode, statusMessage, opponentName, opponentConnected, resultLabel, resultTone]);

  const isLoadingPhase = phase === 'connecting' || phase === 'matching' || phase === 'joining';
  const resultColor = toneToColor(resultTone ?? null);

  // Log mode formatting
  const displayMode = isValidGameMode(mode) ? getDisplayName(mode) : mode || 'Classic';
  console.log('🎮 Mode display formatting:', {
    rawMode: mode,
    displayMode: displayMode,
  });

  return (
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <Text style={[typography.bodyPrimary, styles.statusLabel]}>Match status</Text>
        {isLoadingPhase && showSpinner && (
          <ActivityIndicator color={colors.accentTeal} size="small" />
        )}
      </View>
      <Text style={[typography.bodyPrimary, styles.statusMessage]}>{statusMessage}</Text>

      <View style={styles.statusMetaRow}>
        <View style={styles.metaItem}>
          <Text style={[typography.bodyPrimary, styles.metaLabel]}>Opponent</Text>
          <Text style={[typography.bodyPrimary, styles.metaValueText]}>
            {opponentName ?? (phase === 'matching' ? 'Searching…' : 'Waiting…')}
          </Text>
          <Text style={[typography.bodyPrimary, styles.metaSubLabel]}>
            {opponentConnected ? 'Connected' : 'Offline'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={[typography.bodyPrimary, styles.metaLabel]}>Mode</Text>
          <Text style={[typography.bodyPrimary, styles.metaValueText]}>{displayMode}</Text>
        </View>
      </View>

      {resultLabel && (
        <Text
          style={[
            typography.bodyPrimary,
            styles.resultLabel,
            resultColor && { color: resultColor },
          ]}
        >
          {resultLabel}
        </Text>
      )}

      {errorMessage && (
        <Text style={[typography.bodyPrimary, styles.errorText]}>{errorMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  statusCard: {
    width: '100%',
    backgroundColor: colors.surfaceOverlay,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderTealSoft,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
  statusMessage: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 22,
    lineHeight: 30,
  },
  statusMetaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
    gap: spacing.xs,
  },
  metaLabel: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  metaSubLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metaValueText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyBold,
    fontSize: 18,
  },
  metaValueMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaPlaceholder: {
    color: colors.textMuted,
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
  },
  resultLabel: {
    textAlign: 'center',
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 24,
    lineHeight: 30,
  },
  errorText: {
    color: colors.accentDangerText,
    textAlign: 'center',
    fontFamily: typography.fontFamilyBold,
  },
});
