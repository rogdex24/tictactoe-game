package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/heroiclabs/nakama-common/runtime"
)

const matchModuleName = "xoxo"
const leaderboardID = "ttt_leaderboard"

// Leaderboard data structures
type playerStats struct {
	Wins   int64 `json:"wins"`
	Losses int64 `json:"losses"`
	Draws  int64 `json:"draws"`
	Games  int64 `json:"games"`
}

type leaderboardRecord struct {
	Rank     int64       `json:"rank"`
	UserID   string      `json:"userId"`
	Username string      `json:"username"`
	Score    int64       `json:"score"`
	Stats    playerStats `json:"stats"`
}

func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
	logger.Info("💥Initializing Tic-Tac-Toe Go module")

	// Create global leaderboard for Tic-Tac-Toe
	if err := nk.LeaderboardCreate(ctx, leaderboardID, true, "desc", "set", "", map[string]interface{}{
		"description": "Tic-Tac-Toe Global Leaderboard",
	}, false); err != nil && err.Error() != "leaderboard already exists" {
		logger.Error("Failed to create leaderboard", "error", err)
		return fmt.Errorf("create leaderboard: %w", err)
	}
	logger.Info("✅ Tic-Tac-Toe leaderboard initialized", "id", leaderboardID)

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

	// Register RPC functions for leaderboard operations
	if err := initializer.RegisterRpc("get_leaderboard", rpcGetLeaderboard); err != nil {
		return fmt.Errorf("register get_leaderboard RPC: %w", err)
	}

	if err := initializer.RegisterRpc("get_player_stats", rpcGetPlayerStats); err != nil {
		return fmt.Errorf("register get_player_stats RPC: %w", err)
	}

	logger.Info("✅ Leaderboard RPC functions registered")

	return nil
}

// RPC function to get leaderboard data
func rpcGetLeaderboard(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	logger.Info("🏆 Getting leaderboard data")

	// Parse request payload (optional limit parameter)
	var request struct {
		Limit int `json:"limit,omitempty"`
	}
	if payload != "" {
		if err := json.Unmarshal([]byte(payload), &request); err != nil {
			logger.Warn("Invalid leaderboard request payload", "error", err)
		}
	}

	// Default limit if not specified
	if request.Limit == 0 {
		request.Limit = 50 // Show top 50 players by default
	}

	// Fetch leaderboard records
	records, ownerRecords, nextCursor, prevCursor, err := nk.LeaderboardRecordsList(ctx, leaderboardID, nil, request.Limit, "", 0)
	if err != nil {
		logger.Error("Failed to fetch leaderboard", "error", err)
		return "", fmt.Errorf("fetch leaderboard: %w", err)
	}

	// Format response
	response := struct {
		Records    []leaderboardRecord `json:"records"`
		NextCursor string              `json:"nextCursor,omitempty"`
		PrevCursor string              `json:"prevCursor,omitempty"`
	}{
		Records:    make([]leaderboardRecord, 0, len(records)),
		NextCursor: nextCursor,
		PrevCursor: prevCursor,
	}

	for i, record := range records {
		stats := playerStats{}
		if record.Metadata != "" {
			if err := json.Unmarshal([]byte(record.Metadata), &stats); err != nil {
				logger.Warn("Failed to parse record metadata", "userId", record.OwnerId, "error", err)
			}
		}

		username := ""
		if record.Username != nil {
			username = record.Username.GetValue()
		}

		response.Records = append(response.Records, leaderboardRecord{
			Rank:     int64(i + 1), // Rankings start at 1
			UserID:   record.OwnerId,
			Username: username,
			Score:    record.Score,
			Stats:    stats,
		})
	}

	// Include owner records if any (not used in this context but part of API)
	_ = ownerRecords

	responseJSON, err := json.Marshal(response)
	if err != nil {
		logger.Error("Failed to marshal leaderboard response", "error", err)
		return "", fmt.Errorf("marshal response: %w", err)
	}

	logger.Info("✅ Leaderboard data retrieved", "recordCount", len(response.Records))
	return string(responseJSON), nil
}

// RPC function to get player statistics
func rpcGetPlayerStats(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	logger.Info("📊 Getting player statistics")

	// Parse request payload (userId)
	var request struct {
		UserID string `json:"userId"`
	}
	if err := json.Unmarshal([]byte(payload), &request); err != nil {
		logger.Error("Invalid player stats request", "error", err)
		return "", fmt.Errorf("invalid request payload: %w", err)
	}

	if request.UserID == "" {
		return "", fmt.Errorf("userId is required")
	}

	// Fetch player's leaderboard record
	_, ownerRecords, _, _, err := nk.LeaderboardRecordsList(ctx, leaderboardID, []string{request.UserID}, 1, "", 0)
	if err != nil {
		logger.Error("Failed to fetch player stats", "error", err, "userId", request.UserID)
		return "", fmt.Errorf("fetch player record: %w", err)
	}

	var response struct {
		UserID   string      `json:"userId"`
		Username string      `json:"username"`
		Score    int64       `json:"score"`
		Rank     int64       `json:"rank"`
		Stats    playerStats `json:"stats"`
		Found    bool        `json:"found"`
	}

	response.UserID = request.UserID
	response.Found = false

	// Check if player has a record
	if len(ownerRecords) > 0 {
		record := ownerRecords[0]
		response.Found = true

		username := ""
		if record.Username != nil {
			username = record.Username.GetValue()
		}
		response.Username = username
		response.Score = record.Score
		response.Rank = record.Rank

		// Parse metadata for W/L/D stats
		if record.Metadata != "" {
			if err := json.Unmarshal([]byte(record.Metadata), &response.Stats); err != nil {
				logger.Warn("Failed to parse player metadata", "userId", request.UserID, "error", err)
			}
		}
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		logger.Error("Failed to marshal player stats response", "error", err)
		return "", fmt.Errorf("marshal response: %w", err)
	}

	logger.Info("✅ Player stats retrieved", "userId", request.UserID, "found", response.Found)
	return string(responseJSON), nil
}
