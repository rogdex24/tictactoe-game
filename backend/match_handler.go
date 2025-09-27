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
	matchHandlerName   = "xoxo"
	defaultMatchMode   = "classic"
	boardCellCount     = 9
	opCodeMatchStart   = int64(1)
	opCodeMatchUpdate  = int64(2)
	opCodeMatchEnd     = int64(3)
	opCodePlayerMove   = int64(4)
	matchPhaseWaiting  = "waiting"
	matchPhasePlaying  = "playing"
	matchPhaseComplete = "complete"
)

type matchHandler struct{}

type matchMove struct {
	UserID   string `json:"userId"`
	Position int    `json:"position"`
	Mark     string `json:"mark"`
}

type matchPlayer struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Mark     string `json:"mark"`
}

type matchPayload struct {
	Mode        string                 `json:"mode"`
	Board       []string               `json:"board"`
	Phase       string                 `json:"phase"`
	Players     map[string]matchPlayer `json:"players"`
	CurrentTurn string                 `json:"currentTurn,omitempty"`
	Winner      string                 `json:"winner,omitempty"`
	WinnerMark  string                 `json:"winnerMark,omitempty"`
	WinningLine []int                  `json:"winningLine,omitempty"`
	MoveNumber  int                    `json:"moveNumber"`
	LastMove    *matchMove             `json:"lastMove,omitempty"`
}

type matchState struct {
	board      []string
	presences  map[string]runtime.Presence
	marks      map[string]string
	markToUser map[string]string
	phase      string
	current    string
	winner     string
	winnerMark string
	winning    []int
	moveCount  int
	lastMove   *matchMove
	mode       string
}

var winningCombinations = [8][3]int{
	{0, 1, 2},
	{3, 4, 5},
	{6, 7, 8},
	{0, 3, 6},
	{1, 4, 7},
	{2, 5, 8},
	{0, 4, 8},
	{2, 4, 6},
}

func newMatch(_ context.Context, _ runtime.Logger, _ *sql.DB, _ runtime.NakamaModule) (runtime.Match, error) {
	return &matchHandler{}, nil
}

func (m *matchHandler) MatchInit(_ context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, params map[string]interface{}) (interface{}, int, string) {
	mode := defaultMatchMode
	if rawMode, ok := params["mode"].(string); ok && rawMode != "" {
		mode = rawMode
	}

	state := &matchState{
		board:      make([]string, boardCellCount),
		presences:  make(map[string]runtime.Presence, 2),
		marks:      make(map[string]string, 2),
		markToUser: make(map[string]string, 2),
		phase:      matchPhaseWaiting,
		mode:       mode,
	}

	label := fmt.Sprintf("mode:%s", mode)
	return state, 1, label
}

func (m *matchHandler) MatchJoinAttempt(_ context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, _ runtime.MatchDispatcher, _ int64, state interface{}, presence runtime.Presence, _ map[string]string) (interface{}, bool, string) {
	matchState := state.(*matchState)
	if len(matchState.presences) >= 2 {
		logger.Warn("rejecting join for user %s: match full", presence.GetUserId())
		return matchState, false, "match is full"
	}
	return matchState, true, ""
}

func (m *matchHandler) MatchJoin(_ context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, dispatcher runtime.MatchDispatcher, _ int64, state interface{}, presences []runtime.Presence) interface{} {
	matchState := state.(*matchState)

	for _, presence := range presences {
		userID := presence.GetUserId()
		matchState.presences[userID] = presence

		if _, ok := matchState.marks[userID]; !ok {
			mark := matchState.assignMark(userID)
			logger.Info("assigned mark %s to user %s", mark, userID)
		}
	}

	if len(matchState.presences) == 2 {
		matchState.startGame()
		if err := m.broadcastState(logger, dispatcher, opCodeMatchStart, matchState); err != nil {
			logger.Error("failed to broadcast start state: %v", err)
		}
	} else {
		if err := m.broadcastState(logger, dispatcher, opCodeMatchStart, matchState); err != nil {
			logger.Error("failed to broadcast waiting state: %v", err)
		}
	}

	return matchState
}

func (m *matchHandler) MatchLeave(_ context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, dispatcher runtime.MatchDispatcher, _ int64, state interface{}, presences []runtime.Presence) interface{} {
	matchState := state.(*matchState)

	for _, presence := range presences {
		userID := presence.GetUserId()
		matchState.removePlayer(userID)
		logger.Info("player %s left match", userID)
	}

	if len(matchState.presences) == 1 && matchState.phase != matchPhaseComplete {
		for userID := range matchState.presences {
			matchState.finishGame(userID, matchState.marks[userID], nil)
			break
		}
		if err := m.broadcastState(logger, dispatcher, opCodeMatchEnd, matchState); err != nil {
			logger.Error("failed to broadcast forfeit result: %v", err)
		}
	}

	return matchState
}

func (m *matchHandler) MatchLoop(_ context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, dispatcher runtime.MatchDispatcher, _ int64, state interface{}, messages []runtime.MatchData) interface{} {
	matchState := state.(*matchState)

	if len(messages) == 0 {
		return matchState
	}

	for _, message := range messages {
		if message.GetOpCode() != opCodePlayerMove {
			logger.Warn("received unsupported opcode %d", message.GetOpCode())
			continue
		}

		if err := m.applyMove(logger, dispatcher, matchState, message); err != nil {
			logger.Warn("invalid move: %v", err)
		}
	}

	return matchState
}

func (m *matchHandler) MatchTerminate(_ context.Context, logger runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, _ runtime.MatchDispatcher, _ int64, state interface{}, _ int) interface{} {
	logger.Info("terminating match after %d presences", len(state.(*matchState).presences))
	return state
}

func (m *matchHandler) MatchSignal(_ context.Context, _ runtime.Logger, _ *sql.DB, _ runtime.NakamaModule, _ runtime.MatchDispatcher, _ int64, state interface{}, _ string) (interface{}, string) {
	return state, ""
}

func (m *matchHandler) broadcastState(logger runtime.Logger, dispatcher runtime.MatchDispatcher, opCode int64, state *matchState) error {
	payload, err := json.Marshal(state.toPayload())
	if err != nil {
		return err
	}

	if err := dispatcher.BroadcastMessage(opCode, payload, nil, nil, true); err != nil {
		return err
	}

	logger.Debug("broadcasted state op=%d phase=%s move=%d", opCode, state.phase, state.moveCount)
	return nil
}

func (m *matchHandler) applyMove(logger runtime.Logger, dispatcher runtime.MatchDispatcher, state *matchState, message runtime.MatchData) error {
	if state.phase != matchPhasePlaying {
		return errors.New("match not accepting moves")
	}

	userID := message.GetUserId()
	if userID == "" {
		return errors.New("move missing user id")
	}
	if state.current == "" || state.current != userID {
		return fmt.Errorf("not %s turn", userID)
	}

	mark, ok := state.marks[userID]
	if !ok {
		return fmt.Errorf("unknown player %s", userID)
	}

	var clientMove struct {
		Position int `json:"position"`
	}

	if err := json.Unmarshal(message.GetData(), &clientMove); err != nil {
		return fmt.Errorf("decode move: %w", err)
	}

	if clientMove.Position < 0 || clientMove.Position >= boardCellCount {
		return fmt.Errorf("position %d out of range", clientMove.Position)
	}

	if state.board[clientMove.Position] != "" {
		return fmt.Errorf("cell %d already occupied", clientMove.Position)
	}

	state.board[clientMove.Position] = mark
	state.moveCount++
	state.lastMove = &matchMove{UserID: userID, Position: clientMove.Position, Mark: mark}

	if winnerMark, line := detectWinner(state.board); winnerMark != "" {
		state.finishGame(userID, winnerMark, line)
		if err := m.broadcastState(logger, dispatcher, opCodeMatchEnd, state); err != nil {
			return err
		}
		return nil
	}

	if isBoardFull(state.board) {
		state.finishGame("", "", nil)
		if err := m.broadcastState(logger, dispatcher, opCodeMatchEnd, state); err != nil {
			return err
		}
		return nil
	}

	state.current = state.nextPlayer(userID)

	if err := m.broadcastState(logger, dispatcher, opCodeMatchUpdate, state); err != nil {
		return err
	}

	return nil
}

func (s *matchState) assignMark(userID string) string {
	if mark, ok := s.marks[userID]; ok {
		return mark
	}

	if _, taken := s.markToUser["X"]; !taken {
		s.marks[userID] = "X"
		s.markToUser["X"] = userID
		return "X"
	}

	s.marks[userID] = "O"
	s.markToUser["O"] = userID
	return "O"
}

func (s *matchState) removePlayer(userID string) {
	delete(s.presences, userID)

	if mark, ok := s.marks[userID]; ok {
		delete(s.markToUser, mark)
		delete(s.marks, userID)
	}
}

func (s *matchState) startGame() {
	s.phase = matchPhasePlaying
	s.board = make([]string, boardCellCount)
	s.moveCount = 0
	s.winning = nil
	s.winner = ""
	s.winnerMark = ""
	s.lastMove = nil

	if userID, ok := s.markToUser["X"]; ok {
		s.current = userID
	}
}

func (s *matchState) finishGame(winnerID, winnerMark string, line []int) {
	s.phase = matchPhaseComplete
	s.winner = winnerID
	s.winnerMark = winnerMark
	s.winning = line
	s.current = ""
}

func (s *matchState) nextPlayer(currentUser string) string {
	if len(s.presences) < 2 {
		return ""
	}

	if mark, ok := s.marks[currentUser]; ok {
		if mark == "X" {
			return s.markToUser["O"]
		}
		return s.markToUser["X"]
	}

	return ""
}

func (s *matchState) toPayload() matchPayload {
	boardCopy := make([]string, len(s.board))
	copy(boardCopy, s.board)

	players := make(map[string]matchPlayer, len(s.presences))
	for userID, presence := range s.presences {
		mark := s.marks[userID]
		players[userID] = matchPlayer{
			UserID:   userID,
			Username: presence.GetUsername(),
			Mark:     mark,
		}
	}

	payload := matchPayload{
		Mode:        s.mode,
		Board:       boardCopy,
		Phase:       s.phase,
		Players:     players,
		CurrentTurn: s.current,
		Winner:      s.winner,
		WinnerMark:  s.winnerMark,
		MoveNumber:  s.moveCount,
		LastMove:    s.lastMove,
	}

	if len(s.winning) > 0 {
		payload.WinningLine = append([]int{}, s.winning...)
	}

	return payload
}

func detectWinner(board []string) (string, []int) {
	for _, combo := range winningCombinations {
		a, b, c := combo[0], combo[1], combo[2]
		candidate := board[a]
		if candidate == "" {
			continue
		}

		if board[b] == candidate && board[c] == candidate {
			return candidate, []int{a, b, c}
		}
	}

	return "", nil
}

func isBoardFull(board []string) bool {
	for _, cell := range board {
		if cell == "" {
			return false
		}
	}

	return true
}
