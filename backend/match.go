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
	opcodeMatchState int64 = 1
	opcodeMakeMove   int64 = 2
	opcodeError      int64 = 3
)

type playerSlot struct {
	Presence  runtime.Presence
	Username  string
	Mark      string
	Connected bool
}

type matchState struct {
	Mode         string
	Board        [9]string
	Players      map[string]*playerSlot
	CurrentMark  string
	MoveCount    int
	WinnerMark   string
	WinnerUserID string
	WinningCells []int
	Completed    bool
	Result       string
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

func (h *TicTacToeMatchHandler) MatchInit(_ context.Context, _ runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, params map[string]interface{}) (interface{}, int, string) {
	mode := "classic"
	if rawMode, ok := params["mode"]; ok {
		if modeValue, ok := rawMode.(string); ok && modeValue != "" {
			mode = modeValue
		}
	}

	state := &matchState{
		Mode:        mode,
		Players:     map[string]*playerSlot{},
		CurrentMark: "X",
	}

	return state, 5, ""
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

	for _, presence := range presences {
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

	h.broadcastState(ctx, logger, dispatcher, gameState)
	return gameState
}

func (h *TicTacToeMatchHandler) MatchLeave(ctx context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, dispatcher runtime.MatchDispatcher, _ int64, state interface{}, presences []runtime.Presence) interface{} {
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

	h.broadcastState(ctx, logger, dispatcher, gameState)
	return gameState
}

func (h *TicTacToeMatchHandler) MatchLoop(ctx context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, dispatcher runtime.MatchDispatcher, _ int64, state interface{}, messages []runtime.MatchData) interface{} {
	gameState := state.(*matchState)

	for _, message := range messages {
		switch message.GetOpCode() {
		case opcodeMakeMove:
			h.handleMove(ctx, logger, dispatcher, gameState, message)
		default:
			logger.Warn("Received unsupported opcode", "op_code", message.GetOpCode())
		}
	}

	return gameState
}

func (h *TicTacToeMatchHandler) MatchTerminate(ctx context.Context, _ runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, _ runtime.MatchDispatcher, _ int64, state interface{}, _ int) interface{} {
	return state
}

func (h *TicTacToeMatchHandler) MatchSignal(ctx context.Context, _ runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, _ runtime.MatchDispatcher, _ int64, state interface{}, _ string) (interface{}, string) {
	return state, ""
}

func (h *TicTacToeMatchHandler) handleMove(ctx context.Context, logger runtime.Logger, dispatcher runtime.MatchDispatcher, state *matchState, message runtime.MatchData) {
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

	h.broadcastState(ctx, logger, dispatcher, state)
}

func (h *TicTacToeMatchHandler) sendError(dispatcher runtime.MatchDispatcher, recipient runtime.Presence, message string) {
	payload, err := json.Marshal(errorPayload{Message: message})
	if err != nil {
		return
	}

	_ = dispatcher.BroadcastMessage(opcodeError, payload, []runtime.Presence{recipient}, nil, true)
}

func (h *TicTacToeMatchHandler) broadcastState(ctx context.Context, logger runtime.Logger, dispatcher runtime.MatchDispatcher, state *matchState) {
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

	if err := dispatcher.BroadcastMessage(opcodeMatchState, encoded, nil, nil, true); err != nil {
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
