# Production Deployment Guide

This guide walks you through deploying the Tic-Tac-Toe Nakama backend to production with SSL termination.

## 📋 Prerequisites

- A GCP VM (or any Ubuntu server) with a public IP address
- Domain `api.tictactoe.kauntalha.dev` pointing to your server's IP
- SSH access to the server

## 🚀 Step 1: Initial Server Setup

### On your GCP VM (or Ubuntu server):

1. **Run the GCP VM setup script** (if using GCP):

   ```bash
   # Download and run the GCP setup helper
   curl -sSL https://raw.githubusercontent.com/rogdex24/tictactoe-game/main/scripts/gcp-vm-setup.sh | bash
   ```

   This script will:
   - Install nano text editor
   - Help you create and run the server setup script

2. **Alternative: Direct server setup** (for any Ubuntu server):
   ```bash
   # Download and run the server deployment setup script directly
   curl -sSL https://raw.githubusercontent.com/rogdex24/tictactoe-game/main/scripts/server-deploy-setup.sh | bash
   ```

The server setup script (`server-deploy-setup.sh`) will:

- Update system packages
- Install Docker and required dependencies
- Clone the repository to `~/tictactoe-game`
- Create `.env` file from template
- Add your user to the Docker group

⚠️ **Important**: After the setup completes, you'll need to log out and log back in (or run `newgrp docker`) for Docker group permissions to take effect.

## 🔒 Step 2: SSL Certificate Setup

1. **Navigate to the backend directory**:

   ```bash
   cd ~/tictactoe-game/backend
   ```

2. **Verify domain configuration**:
   Make sure `api.tictactoe.kauntalha.dev` points to your server's public IP:

   ```bash
   # Check DNS resolution
   nslookup api.tictactoe.kauntalha.dev
   ```

3. **Run the SSL setup script**:

   ```bash
   ./setup-ssl.sh
   ```

   The script will ask: "Is api.tictactoe.kauntalha.dev pointed to this server and accessible from the internet? (y/n)"
   - Answer **`y`** for production setup with real SSL certificates
   - Answer **`n`** for development setup with self-signed certificates

   For production, the script will:
   - Generate temporary self-signed certificates
   - Start services (PostgreSQL, Nakama, Nginx)
   - Obtain Let's Encrypt SSL certificates
   - Configure Nginx with real certificates
   - Set up automatic certificate renewal

## 🐳 Step 3: Start the Nakama Backend

After SSL setup completes, your services should already be running. If you need to manually manage them:

### Start all services:

```bash
cd ~/tictactoe-game/backend
docker compose up -d
```

### Check service status:

```bash
docker compose ps
```

You should see:

- `postgres` - Database server
- `nakama` - Game backend server
- `nginx-proxy` - SSL termination and reverse proxy
- `certbot` - SSL certificate management (runs as needed)

### View logs:

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f nakama
docker compose logs -f nginx
```

### Stop services:

```bash
docker compose down
```

### Restart services:

```bash
docker compose restart
```

## 🧪 Step 4: Verify Deployment

1. **Test HTTP to HTTPS redirect**:

   ```bash
   curl -I http://api.tictactoe.kauntalha.dev
   ```

   Should return a 301/302 redirect to HTTPS.

2. **Test HTTPS endpoint**:

   ```bash
   curl -I https://api.tictactoe.kauntalha.dev
   ```

   Should return a 200 OK response.

3. **Test Nakama health**:

   ```bash
   curl https://api.tictactoe.kauntalha.dev/health
   ```

4. **Check SSL certificate**:
   ```bash
   echo | openssl s_client -servername api.tictactoe.kauntalha.dev -connect api.tictactoe.kauntalha.dev:443 2>/dev/null | openssl x509 -noout -dates
   ```

## 🔄 Step 5: Ongoing Maintenance

### Certificate Renewal

Certificates will auto-renew via the created cron job. To manually renew:

```bash
cd ~/tictactoe-game/backend
./setup-ssl.sh --renew
```

### Update Application

```bash
cd ~/tictactoe-game
git pull origin main
cd backend
docker compose build --no-cache
docker compose up -d
```

### Monitor Logs

```bash
cd ~/tictactoe-game/backend
docker compose logs -f --tail=100
```

### Database Backup (Optional)

```bash
cd ~/tictactoe-game/backend
docker compose exec postgres pg_dump -U postgres nakama > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 🌐 Access Points

After successful deployment:

- **Main API**: `https://api.tictactoe.kauntalha.dev`
- **Health Check**: `https://api.tictactoe.kauntalha.dev/health`
- **Nakama Console**: `https://api.tictactoe.kauntalha.dev/console` (if enabled)

## 🆘 Troubleshooting

### Services won't start:

```bash
# Check Docker is running
sudo systemctl status docker

# Check logs for errors
docker compose logs

# Restart Docker daemon
sudo systemctl restart docker
```

### SSL certificate issues:

```bash
# Check certificate status
docker compose logs certbot

# Force certificate renewal
./setup-ssl.sh --renew
```

### Domain not resolving:

```bash
# Check DNS
nslookup api.tictactoe.kauntalha.dev
dig api.tictactoe.kauntalha.dev

# Check if port 80/443 are accessible
sudo netstat -tlnp | grep ':80\|:443'
```

### Firewall issues:

```bash
# Check firewall status (if ufw is installed)
sudo ufw status

# Open required ports
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22  # SSH
```

## 📁 File Structure

After deployment, your server will have:

```
~/tictactoe-game/
├── backend/
│   ├── docker-compose.yml    # Main service configuration
│   ├── nginx.conf           # Nginx reverse proxy config
│   ├── setup-ssl.sh         # SSL certificate setup script
│   ├── renew-certs.sh       # Auto-generated renewal script
│   └── ssl/                 # Self-signed certificates (fallback)
├── scripts/
│   ├── server-deploy-setup.sh  # Server initialization
│   └── gcp-vm-setup.sh         # GCP VM helper
└── .env                     # Environment configuration
```

## ✅ Success Checklist

- [ ] Server setup completed (`server-deploy-setup.sh`)
- [ ] Domain points to server IP
- [ ] SSL setup completed (`setup-ssl.sh`)
- [ ] All Docker services running (`docker compose ps`)
- [ ] HTTPS endpoint accessible
- [ ] SSL certificate valid
- [ ] Certificate auto-renewal configured

Your Tic-Tac-Toe Nakama backend is now live at `https://api.tictactoe.kauntalha.dev`! 🎉
