REGION ?= us-central1
IMAGE_NAME ?= nakama-server
PROJECT ?= your-project-id
REPOSITORY ?= nakama
ARTIFACT_URI ?= $(REGION)-docker.pkg.dev/$(PROJECT)/$(REPOSITORY)/$(IMAGE_NAME)

.PHONY: up down build deploy

up:
docker compose -f docker-compose.yml up

down:
docker compose -f docker-compose.yml down

build:
docker build -t $(ARTIFACT_URI):local -f Dockerfile.nakama ..

deploy: build
gcloud auth configure-docker $(REGION)-docker.pkg.dev
docker push $(ARTIFACT_URI):local
