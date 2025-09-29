#!/bin/bash
set -euo pipefail

# Server Deploy Setup Script
# This script installs Docker and sets up the server environment for deployment

echo "🚀 Starting server deployment setup..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Check for sudo privileges
if ! sudo -v >/dev/null 2>&1; then
    echo "❌ This script requires sudo privileges. Please make sure your user has sudo access."
    exit 1
fi

echo "✅ Running with proper user privileges"

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install required packages
echo "📦 Installing required packages..."
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    wget \
    unzip

# Install Docker
echo "🐳 Installing Docker..."
if command -v docker >/dev/null 2>&1; then
    echo "ℹ️  Docker is already installed. Version: $(docker --version)"
else
    echo "📥 Downloading and installing Docker..."
    sudo curl -fsSL https://get.docker.com | sh
    
    # Add user to docker group
    echo "👤 Adding user to docker group..."
    sudo usermod -aG docker $USER
    
    echo "✅ Docker installed successfully"
fi


# Start and enable Docker service
echo "🔄 Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker


# Download Repo
REPO_URL="https://github.com/rogdex24/tictactoe-game.git"
APP_DIR="$HOME/tictactoe-game"
if [ -d "$APP_DIR" ]; then
    echo "ℹ️  Application directory already exists. Pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "📥 Cloning application repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Create .env
cp .env.example .env
echo "✅ Created .env file from .env.example. Please update it with your configuration."


# Display completion message
echo ""
echo "🎉 Server deployment setup completed successfully!"
echo ""
echo "✅ Setup complete! Your server is ready for deployment."