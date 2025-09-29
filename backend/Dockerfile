FROM heroiclabs/nakama-pluginbuilder:3.32.0 AS builder

ENV GO111MODULE=on
ENV CGO_ENABLED=1
ENV GOCACHE=/root/.cache/go-build
ENV GOMODCACHE=/go/pkg/mod

WORKDIR /backend

# Copy go.mod and go.sum first for better caching
COPY go.mod go.sum ./

# Download dependencies (cached layer if go.mod/go.sum don't change)
RUN go mod download

# Copy vendor directory (if using vendored dependencies)
COPY vendor/ vendor/

# Copy source code
COPY *.go ./

# Copy configuration files
COPY *.yml *.json ./

# Build with optimizations
RUN go build --trimpath --mod=vendor --buildmode=plugin -ldflags="-s -w" -o ./backend.so

FROM heroiclabs/nakama:3.32.0

COPY --from=builder /backend/backend.so /nakama/data/modules/
COPY --from=builder /backend/local.yml /nakama/data/
COPY --from=builder /backend/*.json /nakama/data/modules/
