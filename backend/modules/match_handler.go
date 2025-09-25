package modules

import (
	"context"
	"database/sql"

	"github.com/heroiclabs/nakama-common/runtime"
)

// InitModule initializes the module
func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
	logger.Info("module initialized")
	return nil
}
