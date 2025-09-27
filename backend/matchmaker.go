package main

import (
	"context"
	"database/sql"

	"github.com/heroiclabs/nakama-common/runtime"
)

func matchmakerMatched(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, entries []runtime.MatchmakerEntry) (string, error) {
	mode := defaultMatchMode
	for _, entry := range entries {
		if value, ok := entry.GetProperties()["mode"]; ok {
			if modeValue, ok := value.(string); ok && modeValue != "" {
				mode = modeValue
				break
			}
		}
	}

	logger.Info("creating authoritative match for %d players (mode=%s)", len(entries), mode)

	matchID, err := nk.MatchCreate(ctx, matchHandlerName, map[string]interface{}{"mode": mode})
	if err != nil {
		logger.Error("failed to create match for mode %s: %v", mode, err)
		return "", err
	}

	return matchID, nil
}
