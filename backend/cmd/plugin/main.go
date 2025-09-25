package main

import (
	"context"
	"database/sql"

	"github.com/heroiclabs/nakama-common/runtime"

	"github.com/example/tictactoe/backend/modules"
)

func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
	logger.Info("Initializing Tic-Tac-Toe Go module")
	return modules.InitModule(ctx, logger, db, nk, initializer)
}
