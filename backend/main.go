package main

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/heroiclabs/nakama-common/runtime"
)

const matchModuleName = "xoxo"

func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
	logger.Info("💥Initializing Tic-Tac-Toe Go module")

	if err := initializer.RegisterMatch(matchModuleName, func(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule) (runtime.Match, error) {
		return &TicTacToeMatchHandler{}, nil
	}); err != nil {
		return fmt.Errorf("register match handler: %w", err)
	}

	if err := initializer.RegisterMatchmakerMatched(func(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, entries []runtime.MatchmakerEntry) (string, error) {
		logger.Info("🎮 MATCHMAKER CALLBACK TRIGGERED",
			"total_entries", len(entries),
			"first_user_id", entries[0].GetPresence().GetUserId())

		// Log all entry details
		for i, entry := range entries {
			logger.Info("📊 Matchmaker entry details",
				"index", i,
				"user_id", entry.GetPresence().GetUserId(),
				"session_id", entry.GetPresence().GetSessionId(),
				"properties", entry.GetProperties())
		}

		if len(entries) < 2 {
			logger.Error("❌ Not enough players for match", "count", len(entries))
			return "", fmt.Errorf("insufficient players: %d", len(entries))
		}

		// Extract mode from the first entry's properties
		mode := "classic" // default mode
		if len(entries) > 0 {
			if properties := entries[0].GetProperties(); properties != nil {
				logger.Info("🔍 Examining first entry properties", "properties", properties)
				if rawMode, ok := properties["mode"]; ok {
					logger.Info("🎯 Found mode property", "raw_mode", rawMode, "type", fmt.Sprintf("%T", rawMode))
					if modeValue, ok := rawMode.(string); ok && modeValue != "" {
						mode = modeValue
						logger.Info("✅ Using extracted mode", "mode", mode)
					} else {
						logger.Warn("⚠️ Failed to cast mode to string", "raw_mode", rawMode)
					}
				} else {
					logger.Warn("⚠️ No 'mode' property found in entry")
				}
			} else {
				logger.Warn("⚠️ Entry has no properties")
			}
		}
		logger.Info("🎮 Final mode for match", "mode", mode)

		// Validate all players are in the same mode
		for i, entry := range entries {
			entryMode := "classic"
			if properties := entry.GetProperties(); properties != nil {
				if rawMode, ok := properties["mode"]; ok {
					if modeValue, ok := rawMode.(string); ok && modeValue != "" {
						entryMode = modeValue
					}
				}
			}

			if entryMode != mode {
				logger.Warn("Mode mismatch in matchmaker entries",
					"expected", mode,
					"actual", entryMode,
					"player", i,
					"user_id", entry.GetPresence().GetUserId())
				return "", fmt.Errorf("mode mismatch: expected %s, got %s", mode, entryMode)
			}
		}

		playerIds := make([]string, len(entries))
		for i, entry := range entries {
			playerIds[i] = entry.GetPresence().GetUserId()
		}

		logger.Info("🚀 Creating authoritative match from matchmaking queue",
			"mode", mode,
			"players", len(entries),
			"player_ids", playerIds)

		// Create the match
		matchID, err := nk.MatchCreate(ctx, matchModuleName, map[string]interface{}{
			"mode":               mode,
			"matchmaker_entries": entries,
		})
		if err != nil {
			logger.Error("💥 Failed to create authoritative match", "error", err, "mode", mode, "module", matchModuleName)
			return "", err
		}

		logger.Info("✅ Match created successfully", "match_id", matchID, "mode", mode)

		// CRITICAL: Return the match ID as token for client notifications
		// Nakama will automatically send MatchmakerMatched envelopes to all matched players
		logger.Info("🎯 Returning match token to Nakama",
			"match_token", matchID,
			"will_notify_users", len(entries),
			"user_ids", playerIds)

		return matchID, nil
	}); err != nil {
		return fmt.Errorf("register matchmaker callback: %w", err)
	}

	return nil
}
