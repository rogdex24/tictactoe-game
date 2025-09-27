package main

import (
	"context"
	"database/sql"

	"github.com/heroiclabs/nakama-common/runtime"
)

func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
	logger.Info("initializing Tic-Tac-Toe Go module")

	if err := initializer.RegisterMatch(matchHandlerName, newMatch); err != nil {
		logger.Error("failed to register match handler: %v", err)
		return err
	}

	if err := initializer.RegisterMatchmakerMatched(matchmakerMatched); err != nil {
		logger.Error("failed to register matchmaker callback: %v", err)
		return err
	}

	return nil
}
