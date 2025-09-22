PLUGIN_NAME=match_handler.so
BUILD_DIR=build

.PHONY: build run lint fmt test

build:
mkdir -p $(BUILD_DIR)
go build -buildmode=plugin -o $(BUILD_DIR)/$(PLUGIN_NAME) ./modules

run:
docker compose -f ../infra/docker-compose.yml up

lint:
golangci-lint run ./...

fmt:
goimports -w ./modules

test:
go test ./...
