package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/heroiclabs/nakama-common/runtime"
)

const (
	opcodeGameStart   int64 = 1
	opcodeBoardUpdate int64 = 2
	opcodeGameOver    int64 = 3
	opcodePlayerMove  int64 = 4
	opcodeError       int64 = 5
)

// Scoring formula constants
const (
	pointsWin  = 3
	pointsDraw = 1
	pointsLoss = -1
)

// External references
const leaderboardIDMatch = "ttt_leaderboard" // Reference to leaderboard ID

type playerSlot struct {
	Presence  runtime.Presence
	Username  string
	Mark      string
	Connected bool
}

type matchState struct {
	Mode               string
	Board              [9]string
	Players            map[string]*playerSlot
	CurrentMark        string
	MoveCount          int
	WinnerMark         string
	WinnerUserID       string
	WinningCells       []int
	Completed          bool
	Result             string
	Started            bool
	LeaderboardUpdated bool // Flag to prevent duplicate leaderboard updates
}

type matchStatePayload struct {
	Board        []string         `json:"board"`
	CurrentMark  string           `json:"currentMark"`
	Mode         string           `json:"mode"`
	Players      []matchPlayerDTO `json:"players"`
	IsComplete   bool             `json:"isComplete"`
	WinnerMark   string           `json:"winnerMark,omitempty"`
	WinnerUserID string           `json:"winnerUserId,omitempty"`
	WinningCells []int            `json:"winningCells,omitempty"`
	Result       string           `json:"result,omitempty"`
}

type matchPlayerDTO struct {
	UserID    string `json:"userId"`
	Username  string `json:"username"`
	Mark      string `json:"mark"`
	Connected bool   `json:"connected"`
}

type movePayload struct {
	Index int `json:"index"`
}

type errorPayload struct {
	Message string `json:"message"`
}

type TicTacToeMatchHandler struct{}

func (h *TicTacToeMatchHandler) MatchInit(_ context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, params map[string]interface{}) (interface{}, int, string) {
	logger.Info("🎯 TIC-TAC-TOE MATCH INITIALIZING!", "params", params)

	mode := "classic"
	if rawMode, ok := params["mode"]; ok {
		if modeValue, ok := rawMode.(string); ok && modeValue != "" {
			mode = modeValue
			logger.Info("✅ Match mode extracted", "mode", mode)
		} else {
			logger.Warn("⚠️ Failed to extract mode from params", "raw_mode", rawMode)
		}
	} else {
		logger.Warn("⚠️ No mode parameter provided, using default", "default_mode", mode)
	}

	state := &matchState{
		Mode:        mode,
		Players:     map[string]*playerSlot{},
		CurrentMark: "X",
	}

	logger.Info("🏁 Match state initialized", "mode", state.Mode, "current_mark", state.CurrentMark)
	return state, 1, ""
}

func (h *TicTacToeMatchHandler) MatchJoinAttempt(_ context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, _ runtime.MatchDispatcher, _ int64, state interface{}, presence runtime.Presence, _ map[string]string) (interface{}, bool, string) {
	gameState := state.(*matchState)

	if _, ok := gameState.Players[presence.GetUserId()]; ok {
		return gameState, true, ""
	}

	if len(gameState.Players) >= 2 {
		logger.Debug("Rejecting join attempt; match already full", "user_id", presence.GetUserId())
		return gameState, false, "match is full"
	}

	return gameState, true, ""
}

func (h *TicTacToeMatchHandler) MatchJoin(ctx context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, dispatcher runtime.MatchDispatcher, _ int64, state interface{}, presences []runtime.Presence) interface{} {
	gameState := state.(*matchState)

	logger.Info("👥 PLAYERS JOINING MATCH",
		"presenceCount", len(presences),
		"existingPlayerCount", len(gameState.Players),
		"matchStarted", gameState.Started)

	for _, presence := range presences {
		logger.Info("👤 Processing player join",
			"userId", presence.GetUserId(),
			"username", presence.GetUsername(),
			"sessionId", presence.GetSessionId())
		player, exists := gameState.Players[presence.GetUserId()]
		if !exists {
			assignedMark, err := nextAvailableMark(gameState.Players)
			if err != nil {
				logger.Error("Failed to assign mark to player", "error", err)
				continue
			}

			player = &playerSlot{Mark: assignedMark}
			gameState.Players[presence.GetUserId()] = player
		}

		player.Presence = presence
		player.Username = presence.GetUsername()
		player.Connected = true
	}

	h.broadcastBoardState(ctx, logger, dispatcher, gameState)

	if len(gameState.Players) == 2 && !gameState.Started {
		gameState.Started = true
		h.broadcastGameStart(ctx, logger, dispatcher, gameState)
	}

	return gameState
}

func (h *TicTacToeMatchHandler) MatchLeave(ctx context.Context, logger runtime.Logger, _ *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, _ int64, state interface{}, presences []runtime.Presence) interface{} {
	gameState := state.(*matchState)

	for _, presence := range presences {
		if player, ok := gameState.Players[presence.GetUserId()]; ok {
			player.Connected = false
			player.Presence = nil
		}
	}

	if !gameState.Completed {
		winnerUserID, winnerMark := remainingActivePlayer(gameState)
		if winnerUserID != "" {
			gameState.Completed = true
			gameState.Result = "forfeit"
			gameState.WinnerMark = winnerMark
			gameState.WinnerUserID = winnerUserID
			gameState.WinningCells = nil
		}
	}

	if gameState.Completed {
		logger.Info("🏁 MATCH COMPLETED - Broadcasting and updating leaderboard",
			"matchCompleted", gameState.Completed,
			"result", gameState.Result,
			"trigger", "MatchLeave")
		h.broadcastBoardState(ctx, logger, dispatcher, gameState)
		h.broadcastGameOver(ctx, logger, dispatcher, gameState)
		// Update leaderboard when match ends due to forfeit
		updateMatchResults(ctx, logger, nk, gameState)
	} else {
		logger.Info("📊 Match not completed yet after leave", "completed", gameState.Completed)
		h.broadcastBoardState(ctx, logger, dispatcher, gameState)
	}

	return gameState
}

func (h *TicTacToeMatchHandler) MatchTerminate(ctx context.Context, _ runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, _ runtime.MatchDispatcher, _ int64, state interface{}, _ int) interface{} {
	return state
}

func (h *TicTacToeMatchHandler) MatchLoop(ctx context.Context, logger runtime.Logger, _ *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, _ int64, state interface{}, messages []runtime.MatchData) interface{} {
	gameState := state.(*matchState)

	for _, message := range messages {
		switch message.GetOpCode() {
		case opcodePlayerMove:
			h.handleMove(ctx, logger, nk, dispatcher, gameState, message)
		default:
			logger.Warn("Received unsupported opcode", "op_code", message.GetOpCode())
		}
	}

	return gameState
}

func (h *TicTacToeMatchHandler) MatchSignal(ctx context.Context, _ runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, _ runtime.MatchDispatcher, _ int64, state interface{}, _ string) (interface{}, string) {
	return state, ""
}

func (h *TicTacToeMatchHandler) handleMove(ctx context.Context, logger runtime.Logger, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, state *matchState, message runtime.MatchData) {
	if state.Completed {
		h.sendError(dispatcher, message, "match already completed")
		return
	}

	player, ok := state.Players[message.GetUserId()]
	if !ok {
		h.sendError(dispatcher, message, "player not part of this match")
		return
	}

	if !player.Connected {
		h.sendError(dispatcher, message, "player is not currently connected")
		return
	}

	if player.Mark != state.CurrentMark {
		h.sendError(dispatcher, message, "not your turn")
		return
	}

	var payload movePayload
	if err := json.Unmarshal(message.GetData(), &payload); err != nil {
		h.sendError(dispatcher, message, "invalid move payload")
		return
	}

	if payload.Index < 0 || payload.Index >= len(state.Board) {
		h.sendError(dispatcher, message, "cell index out of bounds")
		return
	}

	if state.Board[payload.Index] != "" {
		h.sendError(dispatcher, message, "cell already claimed")
		return
	}

	state.Board[payload.Index] = player.Mark
	state.MoveCount++

	if winnerMark, winningCells := checkForWinner(state.Board); winnerMark != "" {
		state.Completed = true
		state.Result = "win"
		state.WinnerMark = winnerMark
		state.WinningCells = winningCells
		// Identify the winning user.
		for userID, slot := range state.Players {
			if slot.Mark == winnerMark {
				state.WinnerUserID = userID
				break
			}
		}
	} else if state.MoveCount >= len(state.Board) {
		state.Completed = true
		state.Result = "draw"
		state.WinnerMark = ""
		state.WinnerUserID = ""
		state.WinningCells = nil
	} else {
		if state.CurrentMark == "X" {
			state.CurrentMark = "O"
		} else {
			state.CurrentMark = "X"
		}
	}

	h.broadcastBoardState(ctx, logger, dispatcher, state)

	if state.Completed {
		logger.Info("🏁 MATCH COMPLETED - Broadcasting and updating leaderboard",
			"matchCompleted", state.Completed,
			"result", state.Result,
			"trigger", "handleMove",
			"winnerUserId", state.WinnerUserID,
			"winnerMark", state.WinnerMark)
		h.broadcastGameOver(ctx, logger, dispatcher, state)
		// Update leaderboard when match ends normally (win/draw)
		updateMatchResults(ctx, logger, nk, state)
	} else {
		logger.Info("🎮 Match continues - not completed yet",
			"currentMark", state.CurrentMark,
			"moveCount", state.MoveCount)
	}
}

func (h *TicTacToeMatchHandler) sendError(dispatcher runtime.MatchDispatcher, recipient runtime.Presence, message string) {
	payload, err := json.Marshal(errorPayload{Message: message})
	if err != nil {
		return
	}

	_ = dispatcher.BroadcastMessage(opcodeError, payload, []runtime.Presence{recipient}, nil, true)
}

func (h *TicTacToeMatchHandler) broadcastGameStart(ctx context.Context, logger runtime.Logger, dispatcher runtime.MatchDispatcher, state *matchState) {
	h.broadcastState(ctx, logger, dispatcher, opcodeGameStart, state)
}

func (h *TicTacToeMatchHandler) broadcastBoardState(ctx context.Context, logger runtime.Logger, dispatcher runtime.MatchDispatcher, state *matchState) {
	h.broadcastState(ctx, logger, dispatcher, opcodeBoardUpdate, state)
}

func (h *TicTacToeMatchHandler) broadcastGameOver(ctx context.Context, logger runtime.Logger, dispatcher runtime.MatchDispatcher, state *matchState) {
	h.broadcastState(ctx, logger, dispatcher, opcodeGameOver, state)
}

func (h *TicTacToeMatchHandler) broadcastState(ctx context.Context, logger runtime.Logger, dispatcher runtime.MatchDispatcher, opcode int64, state *matchState) {
	players := make([]matchPlayerDTO, 0, len(state.Players))
	for userID, slot := range state.Players {
		players = append(players, matchPlayerDTO{
			UserID:    userID,
			Username:  slot.Username,
			Mark:      slot.Mark,
			Connected: slot.Connected,
		})
	}

	boardSnapshot := make([]string, len(state.Board))
	copy(boardSnapshot, state.Board[:])

	payload := matchStatePayload{
		Board:        boardSnapshot,
		CurrentMark:  state.CurrentMark,
		Mode:         state.Mode,
		Players:      players,
		IsComplete:   state.Completed,
		WinnerMark:   state.WinnerMark,
		WinnerUserID: state.WinnerUserID,
		WinningCells: state.WinningCells,
		Result:       state.Result,
	}

	encoded, err := json.Marshal(payload)
	if err != nil {
		logger.Error("Failed to marshal match state", "error", err)
		return
	}

	if err := dispatcher.BroadcastMessage(opcode, encoded, nil, nil, true); err != nil {
		logger.Error("Failed to broadcast match state", "error", err)
	}
}

func nextAvailableMark(players map[string]*playerSlot) (string, error) {
	marksTaken := map[string]bool{"X": false, "O": false}
	for _, slot := range players {
		if slot.Mark == "X" || slot.Mark == "O" {
			marksTaken[slot.Mark] = true
		}
	}

	if !marksTaken["X"] {
		return "X", nil
	}
	if !marksTaken["O"] {
		return "O", nil
	}

	return "", errors.New("no available marks")
}

func remainingActivePlayer(state *matchState) (string, string) {
	var winnerUserID string
	var winnerMark string

	for userID, slot := range state.Players {
		if slot.Connected {
			if winnerUserID == "" {
				winnerUserID = userID
				winnerMark = slot.Mark
			} else {
				// More than one active player remains; no forfeit yet.
				return "", ""
			}
		}
	}

	return winnerUserID, winnerMark
}

func checkForWinner(board [9]string) (string, []int) {
	winningLines := [][]int{
		{0, 1, 2},
		{3, 4, 5},
		{6, 7, 8},
		{0, 3, 6},
		{1, 4, 7},
		{2, 5, 8},
		{0, 4, 8},
		{2, 4, 6},
	}

	for _, line := range winningLines {
		first := board[line[0]]
		if first == "" {
			continue
		}

		if board[line[1]] == first && board[line[2]] == first {
			return first, []int{line[0], line[1], line[2]}
		}
	}

	return "", nil
}

func (h *TicTacToeMatchHandler) String() string {
	return fmt.Sprintf("%s match handler", matchModuleName)
}

// Leaderboard helper functions

// calculateScore computes the score based on W/L/D record using the formula:
// Score = Base(100) + 3*wins + 1*draws - 1*losses
// Base score ensures all scores remain positive, even with many losses
func calculateScore(wins, losses, draws int64) int64 {
	baseScore := int64(100) // Ensures scores stay positive
	return baseScore + pointsWin*wins + pointsDraw*draws + pointsLoss*losses
}

// getPlayerStats fetches current stats for a player from the leaderboard
func getPlayerStats(ctx context.Context, nk runtime.NakamaModule, userID string) (*playerStats, error) {
	_, ownerRecords, _, _, err := nk.LeaderboardRecordsList(ctx, leaderboardIDMatch, []string{userID}, 1, "", 0)
	if err != nil {
		return nil, fmt.Errorf("fetch player record: %w", err)
	}

	stats := &playerStats{
		Wins:   0,
		Losses: 0,
		Draws:  0,
		Games:  0,
	}

	if len(ownerRecords) > 0 && ownerRecords[0].Metadata != "" {
		if err := json.Unmarshal([]byte(ownerRecords[0].Metadata), stats); err != nil {
			return nil, fmt.Errorf("parse player metadata: %w", err)
		}
	}

	return stats, nil
}

// updatePlayerLeaderboard updates a player's leaderboard entry with new match result
func updatePlayerLeaderboard(ctx context.Context, logger runtime.Logger, nk runtime.NakamaModule, userID, username string, result string) error {
	logger.Info("🔍 FETCHING current player stats", "userId", userID, "username", username)

	// Fetch current stats
	stats, err := getPlayerStats(ctx, nk, userID)
	if err != nil {
		logger.Error("❌ FAILED to get player stats", "userId", userID, "error", err)
		return fmt.Errorf("get player stats: %w", err)
	}

	logger.Info("📊 Current player stats BEFORE update",
		"userId", userID,
		"wins", stats.Wins,
		"losses", stats.Losses,
		"draws", stats.Draws,
		"games", stats.Games)

	// Update stats based on result
	switch result {
	case "win":
		stats.Wins++
		logger.Info("🏆 Incrementing WINS", "userId", userID, "newWins", stats.Wins)
	case "loss":
		stats.Losses++
		logger.Info("💔 Incrementing LOSSES", "userId", userID, "newLosses", stats.Losses)
	case "draw":
		stats.Draws++
		logger.Info("🤝 Incrementing DRAWS", "userId", userID, "newDraws", stats.Draws)
	default:
		logger.Error("❌ INVALID result type", "result", result, "userId", userID)
		return fmt.Errorf("invalid result: %s", result)
	}
	stats.Games++

	logger.Info("📊 Updated player stats AFTER increment",
		"userId", userID,
		"wins", stats.Wins,
		"losses", stats.Losses,
		"draws", stats.Draws,
		"games", stats.Games)

	// Calculate new score
	newScore := calculateScore(stats.Wins, stats.Losses, stats.Draws)
	logger.Info("🧮 Calculated new score",
		"userId", userID,
		"formula", "100 + 3*wins + 1*draws - 1*losses",
		"calculation", fmt.Sprintf("100 + 3*%d + 1*%d - 1*%d", stats.Wins, stats.Draws, stats.Losses),
		"newScore", newScore)

	// Prepare metadata
	metadata := map[string]interface{}{
		"wins":   stats.Wins,
		"losses": stats.Losses,
		"draws":  stats.Draws,
		"games":  stats.Games,
	}

	logger.Info("💾 WRITING to leaderboard",
		"leaderboardId", leaderboardIDMatch,
		"userId", userID,
		"username", username,
		"score", newScore,
		"metadata", metadata)

	// Write to leaderboard
	if _, err := nk.LeaderboardRecordWrite(ctx, leaderboardIDMatch, userID, username, newScore, int64(0), metadata, nil); err != nil {
		logger.Error("❌ FAILED to write leaderboard record",
			"userId", userID,
			"username", username,
			"score", newScore,
			"error", err)
		return fmt.Errorf("write leaderboard record: %w", err)
	}

	logger.Info("✅ SUCCESS: Updated player leaderboard",
		"userId", userID,
		"username", username,
		"result", result,
		"newScore", newScore,
		"wins", stats.Wins,
		"losses", stats.Losses,
		"draws", stats.Draws,
		"games", stats.Games)

	return nil
}

// updateMatchResults handles leaderboard updates for all players when a match ends
func updateMatchResults(ctx context.Context, logger runtime.Logger, nk runtime.NakamaModule, state *matchState) {
	// Prevent duplicate leaderboard updates
	if state.LeaderboardUpdated {
		logger.Info("⚠️ LEADERBOARD ALREADY UPDATED - Skipping duplicate update",
			"completed", state.Completed,
			"result", state.Result)
		return
	}

	// Mark as updated to prevent duplicates
	state.LeaderboardUpdated = true

	logger.Info("📊 LEADERBOARD UPDATE START",
		"completed", state.Completed,
		"result", state.Result,
		"winnerMark", state.WinnerMark,
		"winnerUserId", state.WinnerUserID,
		"playerCount", len(state.Players))

	// Log all players in the match
	for userID, slot := range state.Players {
		logger.Info("👤 Player in match",
			"userId", userID,
			"username", slot.Username,
			"mark", slot.Mark,
			"connected", slot.Connected)
	}

	if !state.Completed {
		logger.Warn("⚠️ SKIPPING: Attempted to update leaderboard for incomplete match")
		return
	}

	logger.Info("🎯 Processing leaderboard updates for all players...")

	for userID, slot := range state.Players {
		// Determine result for this player
		var result string
		switch state.Result {
		case "win":
			if userID == state.WinnerUserID {
				result = "win"
				logger.Info("🏆 Player is WINNER", "userId", userID, "username", slot.Username)
			} else {
				result = "loss"
				logger.Info("💔 Player is LOSER", "userId", userID, "username", slot.Username)
			}
		case "draw":
			result = "draw"
			logger.Info("🤝 Player has DRAW", "userId", userID, "username", slot.Username)
		case "forfeit":
			if userID == state.WinnerUserID {
				result = "win" // Winner by forfeit
				logger.Info("🏆 Player WINS by forfeit", "userId", userID, "username", slot.Username)
			} else {
				result = "loss" // Lost by forfeit
				logger.Info("💔 Player LOSES by forfeit", "userId", userID, "username", slot.Username)
			}
		default:
			logger.Error("❌ Unknown match result type", "result", state.Result, "userId", userID)
			continue
		}

		// Update player's leaderboard entry
		username := slot.Username
		if username == "" {
			username = fmt.Sprintf("User_%s", userID[:8]) // Fallback username
			logger.Warn("⚠️ Using fallback username", "userId", userID, "fallback", username)
		}

		logger.Info("🔄 Attempting leaderboard update",
			"userId", userID,
			"username", username,
			"result", result)

		if err := updatePlayerLeaderboard(ctx, logger, nk, userID, username, result); err != nil {
			logger.Error("❌ FAILED to update leaderboard for player",
				"userId", userID,
				"username", username,
				"result", result,
				"error", err)
		} else {
			logger.Info("✅ SUCCESS: Updated leaderboard for player",
				"userId", userID,
				"username", username,
				"result", result)
		}
	}

	logger.Info("🎉 LEADERBOARD UPDATE COMPLETE - All players processed")
}
