# Backend Agent Guide

## Scope

These conventions apply to all files within the `backend/` directory.

## Style Guidelines

- All Go code must be formatted with `gofmt` before committing.
- Prefer small, focused files. Keep match logic and helper types close to their usage.
- Use descriptive constant names for Nakama opcodes and match phases.
- Avoid package-level mutable state unless it is immutable configuration.
- Log actionable messages with context keys (e.g., mode, user ID counts) to simplify debugging.

## Nakama Runtime Practices

- Register match handlers and callbacks in `InitModule` and return any errors immediately.
- Keep authoritative match state encapsulated in dedicated structs. Expose helper methods on the struct rather than scattering logic across functions.
- Always validate incoming messages from clients. Reject invalid opcodes, turns, or board positions with logged warnings to aid cheating detection.
- When broadcasting match state, marshal JSON once per dispatch and reuse helper functions to avoid duplicated logic.
- Clean up when matches finish: clear turn markers, winner flags, and mark the phase as `complete` before broadcasting the final state.

## Testing Expectations

- Ensure `go test ./...` passes after changes.
- When feasible, add unit tests around pure helpers (e.g., board evaluation functions).
