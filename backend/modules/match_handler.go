package modules

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/heroiclabs/nakama-common/runtime"
)

const (
	messageCodeState     = 1
	messageCodeHeartbeat = 2

	matchLabelClassic    = "classic"
	leaderboardClassicID = "tictactoe_classic"
)

type MatchState struct {
	Players  map[string]runtime.Presence
	Order    []string
	Board    [9]string
	Turn     string
	Winner   string
	Finished bool
}

type matchMessage struct {
	Action string `json:"action"`
	Index  int    `json:"index"`
}

type matchHandler struct{}

func (m *matchHandler) MatchInit(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, params map[string]interface{}) (interface{}, int, string) {
	logger.Info("initialising tic-tac-toe match")
	state := &MatchState{
		Players: make(map[string]runtime.Presence),
		Turn:    "x",
	}

	return state, 1, matchLabelClassic
}

func (m *matchHandler) MatchJoinAttempt(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presence runtime.Presence, metadata map[string]string) (interface{}, bool, string) {
	matchState := state.(*MatchState)

	if len(matchState.Players) >= 2 {
		return state, false, "match_full"
	}

	logger.Debug("player join attempt", "user_id", presence.GetUserId())
	return state, true, ""
}

func (m *matchHandler) MatchJoin(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	matchState := state.(*MatchState)
	for _, presence := range presences {
		userID := presence.GetUserId()
		matchState.Players[userID] = presence
		matchState.ensureOrder(userID)
	}

	broadcastMatchState(logger, dispatcher, matchState)
	return matchState
}

func (m *matchHandler) MatchLeave(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	matchState := state.(*MatchState)
	for _, presence := range presences {
		userID := presence.GetUserId()
		delete(matchState.Players, userID)
		matchState.removeOrder(userID)
	}

	return matchState
}

func (m *matchHandler) MatchLoop(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, messages []runtime.MatchData) interface{} {
	matchState := state.(*MatchState)

	for _, message := range messages {
		if matchState.Finished {
			continue
		}

		var payload matchMessage
		if err := json.Unmarshal(message.GetData(), &payload); err != nil {
			logger.Error("invalid match payload", "error", err)
			continue
		}

		switch payload.Action {
		case "move":
			handleMove(ctx, logger, nk, dispatcher, matchState, message, payload)
		default:
			logger.Warn("unhandled action", "action", payload.Action)
		}
	}

	if tick%30 == 0 {
		if err := dispatcher.BroadcastMessage(messageCodeHeartbeat, []byte(`{"type":"heartbeat"}`), nil, nil, true); err != nil {
			logger.Error("heartbeat broadcast failed", "error", err)
		}
	}

	return matchState
}

func (m *matchHandler) MatchTerminate(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, graceSeconds int) interface{} {
	logger.Info("terminating match", "tick", tick)
	return state
}

func (m *matchHandler) MatchSignal(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, data string) (interface{}, string) {
	logger.Debug("match signal", "data", data)
	return state, ""
}

func handleMove(ctx context.Context, logger runtime.Logger, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, state *MatchState, message runtime.MatchData, payload matchMessage) {
	if payload.Index < 0 || payload.Index >= len(state.Board) {
		logger.Warn("move out of bounds", "index", payload.Index)
		return
	}

	if state.Board[payload.Index] != "" {
		logger.Warn("cell already taken", "index", payload.Index)
		return
	}

	userID := message.GetUserId()
	marker := state.playerMarker(userID)
	if marker == "" {
		logger.Warn("unknown player", "user_id", userID)
		return
	}

	if marker != state.Turn {
		logger.Warn("not player turn", "user_id", userID)
		return
	}

	state.Board[payload.Index] = marker
	state.Turn = opponent(marker)

	if winner := evaluateWinner(state.Board); winner != "" {
		state.Winner = winner
		state.Finished = true
	}

	if isBoardFull(state.Board) && state.Winner == "" {
		state.Finished = true
	}

	if state.Finished {
		winnerID := state.userIDForMarker(state.Winner)
		if winnerID != "" {
			if err := writeLeaderboardRecord(ctx, logger, nk, leaderboardClassicID, winnerID, "", 1, 0, map[string]interface{}{"result": "win"}); err != nil {
				logger.Error("leaderboard update failed", "error", err)
			}
		}
	}

	broadcastMatchState(logger, dispatcher, state)
}

func (s *MatchState) playerMarker(userID string) string {
	for idx, id := range s.Order {
		if id == userID {
			return markerForIndex(idx)
		}
	}

	return ""
}

func (s *MatchState) ensureOrder(userID string) {
	for _, id := range s.Order {
		if id == userID {
			return
		}
	}

	s.Order = append(s.Order, userID)
}

func (s *MatchState) removeOrder(userID string) {
	for idx, id := range s.Order {
		if id == userID {
			s.Order = append(s.Order[:idx], s.Order[idx+1:]...)
			break
		}
	}
}

func (s *MatchState) userIDForMarker(marker string) string {
	switch marker {
	case "x":
		if len(s.Order) > 0 {
			return s.Order[0]
		}
	case "o":
		if len(s.Order) > 1 {
			return s.Order[1]
		}
	}

	return ""
}

func markerForIndex(idx int) string {
	switch idx {
	case 0:
		return "x"
	case 1:
		return "o"
	default:
		return ""
	}
}

func opponent(marker string) string {
	if marker == "x" {
		return "o"
	}

	return "x"
}

func evaluateWinner(board [9]string) string {
	winningCombos := [8][3]int{{0, 1, 2}, {3, 4, 5}, {6, 7, 8}, {0, 3, 6}, {1, 4, 7}, {2, 5, 8}, {0, 4, 8}, {2, 4, 6}}

	for _, combo := range winningCombos {
		first := board[combo[0]]
		if first != "" && first == board[combo[1]] && first == board[combo[2]] {
			return first
		}
	}

	return ""
}

func isBoardFull(board [9]string) bool {
	for _, cell := range board {
		if cell == "" {
			return false
		}
	}

	return true
}

func broadcastMatchState(logger runtime.Logger, dispatcher runtime.MatchDispatcher, state *MatchState) {
	payload := map[string]interface{}{
		"board":    state.Board,
		"turn":     state.Turn,
		"winner":   state.Winner,
		"finished": state.Finished,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		logger.Error("failed to marshal match state", "error", err)
		return
	}

	if err := dispatcher.BroadcastMessage(messageCodeState, data, nil, nil, true); err != nil {
		logger.Error("state broadcast failed", "error", err)
	}
}

func deviceAuthRpc(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	req := struct {
		DeviceID string `json:"deviceId"`
	}{}

	if err := json.Unmarshal([]byte(payload), &req); err != nil {
		return "", runtime.NewError("invalid payload", 3)
	}

	if req.DeviceID == "" {
		return "", runtime.NewError("device id required", 3)
	}

	userID := fmt.Sprintf("device:%s", req.DeviceID)
	userID, authToken, _, err := nk.AuthenticateDevice(ctx, req.DeviceID, userID, true)
	if err != nil {
		return "", fmt.Errorf("authenticate device: %w", err)
	}

	response := map[string]string{
		"userId": userID,
		"token":  authToken,
	}

	data, err := json.Marshal(response)
	if err != nil {
		return "", fmt.Errorf("marshal auth response: %w", err)
	}

	return string(data), nil
}

func writeLeaderboardRecord(ctx context.Context, logger runtime.Logger, nk runtime.NakamaModule, leaderboardID, userID, username string, score, subscore int64, metadata map[string]interface{}) error {
	if _, err := nk.LeaderboardRecordWrite(ctx, leaderboardID, userID, username, score, subscore, metadata, nil); err != nil {
		return fmt.Errorf("write leaderboard record: %w", err)
	}

	logger.Info("leaderboard updated", "user_id", userID, "score", score)
	return nil
}

func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
	if err := initializer.RegisterRpc("device_auth", deviceAuthRpc); err != nil {
		return fmt.Errorf("register device auth rpc: %w", err)
	}

	if err := initializer.RegisterMatch("tictactoe", func(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule) (runtime.Match, error) {
		return &matchHandler{}, nil
	}); err != nil {
		return fmt.Errorf("register match handler: %w", err)
	}

	logger.Info("tic-tac-toe module initialised")
	return nil
}
