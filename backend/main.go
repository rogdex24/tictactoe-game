package main

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/heroiclabs/nakama-common/runtime"
)

const matchModuleName = "xoxo"

func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
	logger.Info("Initializing Tic-Tac-Toe Go module")

	if err := initializer.RegisterMatch(matchModuleName, func(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule) (runtime.Match, error) {
		return &TicTacToeMatchHandler{}, nil
	}); err != nil {
		return fmt.Errorf("register match handler: %w", err)
	}

	if err := initializer.RegisterMatchmakerMatched(func(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, entries []runtime.MatchmakerEntry) (string, error) {
		mode := "classic"
		if len(entries) > 0 {
			if properties := entries[0].GetProperties(); properties != nil {
				if rawMode, ok := properties["mode"]; ok {
					if modeValue, ok := rawMode.(string); ok && modeValue != "" {
						mode = modeValue
					}
				}
			}
		}

		logger.Debug("Creating authoritative match from matchmaking queue", "mode", mode, "players", len(entries))

		matchID, err := nk.MatchCreate(ctx, matchModuleName, map[string]interface{}{"mode": mode})
		if err != nil {
			logger.Error("Failed to create authoritative match", "error", err)
			return "", err
		}

		return matchID, nil
	}); err != nil {
		return fmt.Errorf("register matchmaker callback: %w", err)
	}

	return nil
}
