#!/bin/bash

# SSL Certificate Setup Script for kauntalha.dev
# This script handles the initial setup and renewal of Let's Encrypt certificates

set -e

DOMAIN="kauntalha.dev"
EMAIL="admin@kauntalha.dev"  # Change this to your actual email
BACKEND_DIR="/Users/abu/Desktop/personal-projects/tictactoe-game/backend"

echo "🔧 Setting up SSL certificates for $DOMAIN..."

# Change to backend directory
cd "$BACKEND_DIR"

# Create SSL directory for fallback certificates
mkdir -p ssl

# Function to generate self-signed certificates for initial setup
generate_selfsigned_cert() {
    echo "📋 Generating self-signed certificate for initial setup..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/privkey.pem \
        -out ssl/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=$DOMAIN"
    echo "✅ Self-signed certificate created"
}

# Function to start services with self-signed cert
start_services_initial() {
    echo "🚀 Starting services with self-signed certificate..."
    
    # Update nginx.conf to use local SSL files initially
    cp nginx.conf nginx.conf.backup
    sed -i.bak 's|/etc/letsencrypt/live/kauntalha.dev/fullchain.pem|/etc/nginx/ssl/fullchain.pem|g' nginx.conf
    sed -i.bak 's|/etc/letsencrypt/live/kauntalha.dev/privkey.pem|/etc/nginx/ssl/privkey.pem|g' nginx.conf
    
    docker compose up -d postgres nakama nginx
    sleep 10
    echo "✅ Services started with self-signed certificate"
}

# Function to obtain Let's Encrypt certificate
obtain_letsencrypt_cert() {
    echo "🔐 Obtaining Let's Encrypt certificate..."
    
    # Run certbot to get the certificate
    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "$DOMAIN"
    
    echo "✅ Let's Encrypt certificate obtained"
}

# Function to update nginx config for Let's Encrypt
update_nginx_config() {
    echo "🔄 Updating Nginx configuration for Let's Encrypt..."
    
    # Restore original nginx.conf
    if [ -f nginx.conf.backup ]; then
        mv nginx.conf.backup nginx.conf
    fi
    
    # Reload nginx with new certificates
    docker compose exec nginx nginx -s reload
    echo "✅ Nginx configuration updated"
}

# Function to setup certificate renewal
setup_renewal() {
    echo "⏰ Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > renew-certs.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker compose run --rm certbot renew --webroot --webroot-path=/var/www/certbot
docker compose exec nginx nginx -s reload
echo "Certificate renewal completed at $(date)"
EOF
    
    chmod +x renew-certs.sh
    echo "✅ Renewal script created: renew-certs.sh"
    echo "📋 To setup automatic renewal, add this to your crontab:"
    echo "0 12 * * * $BACKEND_DIR/renew-certs.sh >> $BACKEND_DIR/certbot.log 2>&1"
}

# Function to test the setup
test_setup() {
    echo "🧪 Testing SSL setup..."
    
    # Wait for services to be ready
    sleep 15
    
    # Test HTTP redirect
    echo "Testing HTTP to HTTPS redirect..."
    curl -I http://$DOMAIN 2>/dev/null | grep -q "301\|302" && echo "✅ HTTP redirect working" || echo "❌ HTTP redirect failed"
    
    # Test HTTPS
    echo "Testing HTTPS connection..."
    curl -I https://$DOMAIN 2>/dev/null | grep -q "200\|301\|302" && echo "✅ HTTPS working" || echo "❌ HTTPS failed"
    
    echo "🎉 SSL setup completed!"
}

# Main execution
main() {
    echo "🏁 Starting SSL setup process..."
    
    # Check if running on server with domain pointed to this machine
    read -p "Is $DOMAIN pointed to this server and accessible from the internet? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Production setup
        echo "📡 Setting up for production..."
        generate_selfsigned_cert
        start_services_initial
        obtain_letsencrypt_cert
        update_nginx_config
        setup_renewal
        test_setup
    else
        # Development setup with self-signed certificate
        echo "🏠 Setting up for development with self-signed certificate..."
        generate_selfsigned_cert
        start_services_initial
        setup_renewal
        echo "⚠️  Development setup complete with self-signed certificate"
        echo "📋 For production, ensure $DOMAIN points to this server and run this script again"
    fi
}

# Show usage if help requested
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "SSL Certificate Setup Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  --renew     Renew existing certificates"
    echo "  --test      Test current SSL setup"
    echo "  --help      Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  DOMAIN      Domain name (default: kauntalha.dev)"
    echo "  EMAIL       Email for Let's Encrypt (default: admin@kauntalha.dev)"
    exit 0
elif [[ "$1" == "--renew" ]]; then
    echo "🔄 Renewing certificates..."
    cd "$BACKEND_DIR"
    ./renew-certs.sh
elif [[ "$1" == "--test" ]]; then
    test_setup
else
    main
fi