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
   ./ssl-setup-complete.sh
   ```

   **Alternative**: Use the legacy setup script:

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

4. **If SSL certificate issues occur**:

   The new consolidated script includes fix capabilities:

   ```bash
   # Fix existing certificate loading issues
   ./ssl-setup-complete.sh --fix

   # Verify certificate is working
   ./ssl-setup-complete.sh --verify

   # Test complete SSL setup
   ./ssl-setup-complete.sh --test
   ```

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
# Using the new consolidated script (recommended)
./ssl-setup-complete.sh --renew

# Or using the legacy renewal script
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

### SSL Certificate Issues

If you encounter SSL certificate problems, use the comprehensive troubleshooting tools:

1. **Complete SSL diagnostics**:

   ```bash
   cd ~/tictactoe-game/backend
   ./troubleshoot-ssl.sh
   ```

   This script checks DNS, ports, ACME challenges, certificate status, and provides specific recommendations.

2. **Fix SSL certificate loading**:

   ```bash
   ./ssl-setup-complete.sh --fix
   ```

   Automatically detects and fixes common certificate loading issues.

3. **Debug SSL step-by-step**:

   ```bash
   ./debug-ssl.sh
   ```

   Manual certificate testing with detailed logging.

4. **Verify SSL is working**:
   ```bash
   ./ssl-setup-complete.sh --verify
   ```
   Quick check to ensure Let's Encrypt certificate is properly loaded.

### Common SSL Issues and Solutions

- **"SSL certificate problem: self signed certificate"**:
  - Run `./ssl-setup-complete.sh --fix`
  - The issue is usually nginx not loading the Let's Encrypt certificate

- **"No such authorization" during certificate request**:
  - Ensure domain points to your server IP: `nslookup api.tictactoe.kauntalha.dev`
  - Check firewall allows port 80: `sudo ufw allow 80`
  - Run `./troubleshoot-ssl.sh` for detailed diagnostics

- **Certificate exists but HTTPS doesn't work**:
  - Restart nginx: `docker compose restart nginx`
  - Or use the fix command: `./ssl-setup-complete.sh --fix`

### Services won't start:

```bash
# Check Docker is running
sudo systemctl status docker

# Check logs for errors
docker compose logs

# Restart Docker daemon
sudo systemctl restart docker
```

### Legacy SSL certificate issues:

```bash
# Check certificate status
docker compose logs certbot

# Using the new consolidated script (recommended)
./ssl-setup-complete.sh --fix

# Verify certificate is working properly
./ssl-setup-complete.sh --verify

# Force certificate renewal (legacy method)
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
│   ├── docker-compose.yml           # Main service configuration
│   ├── nginx.conf                   # Nginx reverse proxy config
│   ├── ssl-setup-complete.sh        # Complete SSL setup script (recommended)
│   ├── setup-ssl.sh                 # Legacy SSL certificate setup script
│   ├── fix-ssl.sh                   # SSL troubleshooting script
│   ├── troubleshoot-ssl.sh          # SSL diagnostics script
│   ├── debug-ssl.sh                 # SSL debugging script
│   ├── renew-certs.sh               # Auto-generated renewal script
│   └── ssl/                         # Self-signed certificates (fallback)
├── scripts/
│   ├── server-deploy-setup.sh       # Server initialization
│   └── gcp-vm-setup.sh              # GCP VM helper
└── .env                             # Environment configuration
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
