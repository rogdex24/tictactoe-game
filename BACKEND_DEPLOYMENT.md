# Backend Deployment Guide

## Overview

This guide covers the automated deployment of the TicTacToe game backend to a GCP VM using GitHub Actions.

## Prerequisites

### 1. GCP VM Setup

Before running the deployment, ensure your GCP VM is properly configured:

```bash
# On your GCP VM, run the server setup script
curl -fsSL https://raw.githubusercontent.com/rogdex24/tictactoe-game/main/scripts/server-deploy-setup.sh | bash

# Or download and run manually:
wget https://raw.githubusercontent.com/rogdex24/tictactoe-game/main/scripts/server-deploy-setup.sh
chmod +x server-deploy-setup.sh
./server-deploy-setup.sh
```

### 2. Required GitHub Secrets

Configure these secrets in your GitHub repository settings (`Settings` > `Secrets and variables` > `Actions`):

#### GCP VM Access

- `GCP_VM_HOST`: IP address or hostname of your GCP VM
- `GCP_VM_SSH_USER`: SSH username (usually your GCP username)
- `GCP_VM_SSH_KEY`: Private SSH key for accessing the VM
- `GCP_VM_SSH_PORT`: SSH port (optional, defaults to 22)

#### Example SSH Key Setup

```bash
# On your local machine, generate SSH keys (if not already done)
ssh-keygen -t ed25519 -C "github-actions@yourdomain.com"

# Copy the private key content for GitHub secret
cat ~/.ssh/id_ed25519

# Add public key to GCP VM
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-vm-ip
```

## Deployment Workflow

### Manual Deployment

The backend deployment is triggered manually through GitHub Actions:

1. **Navigate to Actions**:
   - Go to your GitHub repository
   - Click on the `Actions` tab
   - Select `Backend Production Deployment`

2. **Configure Deployment**:
   - **Branch**: Choose which branch to deploy (default: main)
   - **Environment**: Select production or staging
   - **Rebuild Dependencies**: Check if you want to rebuild Go modules

3. **Execute Deployment**:
   - Click `Run workflow`
   - Monitor the deployment progress in real-time

### Deployment Process

The workflow performs the following steps:

1. **Pre-deployment**:
   - Validates deployment parameters
   - Connects to GCP VM via SSH
   - Creates backup of current state

2. **Code Update**:
   - Fetches latest changes from GitHub
   - Checks out the specified branch
   - Updates local repository

3. **Service Management**:
   - Stops current backend services
   - Rebuilds Go dependencies (if requested)
   - Validates required files and environment

4. **Docker Deployment**:
   - Executes: `docker compose down && docker compose up --build -d`
   - Builds fresh Docker images
   - Starts services in detached mode

5. **Health Checks**:
   - Verifies containers are running
   - Checks Nakama server responsiveness
   - Retries with backoff on failure

6. **Post-deployment**:
   - Reports deployment status
   - Provides service URLs and status
   - Creates deployment summary

## Backend Architecture

### Docker Services

The backend runs the following services:

```yaml
# docker-compose.yml structure
services:
  postgres:
    image: postgres:13
    # Database for Nakama server state

  nakama:
    build: .
    # Game server with custom Go plugin
    ports:
      - '7350:7350' # HTTP API and WebSocket
```

### Environment Configuration

Required environment variables in `.env`:

```bash
# Database Configuration
POSTGRES_DB=nakama
POSTGRES_USER=nakama
POSTGRES_PASSWORD=your_secure_password

# Nakama Configuration
NAKAMA_SERVER_KEY=your_server_key
NAKAMA_DB_PASSWORD=your_secure_password

# Network Configuration
NAKAMA_PORT=7350
POSTGRES_PORT=5432
```

## Server Architecture

### Go Plugin System

The backend uses Nakama with a custom Go plugin:

- **Location**: `backend/main.go`, `backend/match.go`
- **Features**: Server-authoritative matches, multiple game modes, leaderboards
- **Build Process**: Compiled into plugin during Docker build

### Key Components

1. **Matchmaking**: Custom callback for different game modes
2. **Game Logic**: Server-side validation and anti-cheat
3. **Leaderboard**: Global ranking system with statistics
4. **Real-time Communication**: WebSocket-based match updates

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**:

   ```bash
   # Test SSH connection manually
   ssh -i ~/.ssh/your-key user@vm-ip

   # Check SSH key permissions
   chmod 600 ~/.ssh/your-key
   ```

2. **Docker Build Failed**:

   ```bash
   # Check Docker daemon status
   sudo systemctl status docker

   # Check disk space
   df -h

   # Clean up Docker resources
   docker system prune -f
   ```

3. **Go Build Issues**:

   ```bash
   # Rebuild dependencies manually
   cd ~/tictactoe-game/backend
   go mod tidy
   go mod vendor
   ```

4. **Service Health Check Failed**:

   ```bash
   # Check container status
   docker compose ps

   # View logs
   docker compose logs nakama
   docker compose logs postgres

   # Check port availability
   netstat -tlnp | grep 7350
   ```

### Manual Deployment Commands

If automated deployment fails, you can deploy manually:

```bash
# SSH into your GCP VM
ssh user@your-vm-ip

# Navigate to application directory
cd ~/tictactoe-game/backend

# Update code
git fetch origin
git checkout main
git reset --hard origin/main

# Rebuild and restart services
docker compose down
docker compose up --build -d

# Check status
docker compose ps
curl http://localhost:7350/v2
```

### Rollback Procedure

If deployment fails, rollback using the automatic backup:

```bash
# Find backup location (shown in deployment logs)
ls /tmp/tictactoe-backup-*

# Stop current services
cd ~/tictactoe-game/backend
docker compose down

# Restore from backup
BACKUP_DIR="/tmp/tictactoe-backup-YYYYMMDD-HHMMSS"
cp -r "$BACKUP_DIR/backend"/* .

# Restart services
docker compose up -d
```

## Monitoring and Maintenance

### Service Monitoring

```bash
# Check service status
docker compose ps

# View real-time logs
docker compose logs -f

# Monitor resource usage
docker stats

# Check system resources
htop
df -h
```

### Database Backup

```bash
# Create database backup
docker compose exec postgres pg_dump -U nakama nakama > backup_$(date +%Y%m%d).sql

# Restore from backup
docker compose exec -T postgres psql -U nakama nakama < backup_file.sql
```

### Security Considerations

1. **Firewall Rules**: Ensure only necessary ports are open
2. **SSL/TLS**: Configure HTTPS for production
3. **Database Security**: Use strong passwords and limit access
4. **SSH Keys**: Regularly rotate SSH keys
5. **Updates**: Keep system packages updated

## Performance Optimization

### Docker Optimization

```bash
# Optimize Docker images
docker image prune -f

# Monitor container performance
docker stats --no-stream

# Limit container resources (in docker-compose.yml)
services:
  nakama:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

### Database Tuning

```bash
# PostgreSQL performance tuning
# Edit postgresql.conf for production workloads
shared_buffers = 256MB
effective_cache_size = 1GB
max_connections = 100
```

## API Endpoints

After successful deployment, the following endpoints are available:

- **Nakama API**: `http://your-vm-ip:7350/v2`
- **WebSocket**: `ws://your-vm-ip:7350/ws`
- **Health Check**: `http://your-vm-ip:7350/v2`
- **Admin Console**: `http://your-vm-ip:7351` (if enabled)

## Next Steps

1. **Configure Domain**: Set up DNS and reverse proxy
2. **SSL Certificate**: Install Let's Encrypt certificate
3. **Monitoring**: Set up application monitoring
4. **Backup Strategy**: Implement automated backups
5. **Scaling**: Configure horizontal scaling if needed

---

**⚠️ Important**: Always test deployments in a staging environment before deploying to production!
