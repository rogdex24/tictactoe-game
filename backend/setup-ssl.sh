#!/bin/bash

# SSL Certificate Setup Script for kauntalha.dev
# This script handles the initial setup and renewal of Let's Encrypt certificates

set -e

DOMAIN="api.tictactoe.kauntalha.dev"
EMAIL="admin@kauntalha.dev"  # Change this to your actual email
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
    sed -i.bak 's|/etc/letsencrypt/live/api.tictactoe.kauntalha.dev/fullchain.pem|/etc/nginx/ssl/fullchain.pem|g' nginx.conf
    sed -i.bak 's|/etc/letsencrypt/live/api.tictactoe.kauntalha.dev/privkey.pem|/etc/nginx/ssl/privkey.pem|g' nginx.conf
    
    docker compose up -d postgres nakama nginx
    sleep 10
    echo "✅ Services started with self-signed certificate"
}

# Function to obtain Let's Encrypt certificate
obtain_letsencrypt_cert() {
    echo "🔐 Obtaining Let's Encrypt certificate..."
    
    # First, test if the domain is accessible for ACME challenge
    echo "🧪 Testing domain accessibility..."
    
    # Ensure the certbot webroot directory exists on the host
    # The directory should be created by docker-compose volumes, but let's make sure
    docker compose run --rm --entrypoint="" certbot sh -c "mkdir -p /var/www/certbot/.well-known/acme-challenge"
    
    # Create a test file for ACME challenge verification using certbot container
    docker compose run --rm --entrypoint="" certbot sh -c 'echo "test-challenge-file" > /var/www/certbot/.well-known/acme-challenge/test'
    
    # Test if we can access the challenge file
    sleep 5
    if curl -f "http://$DOMAIN/.well-known/acme-challenge/test" >/dev/null 2>&1; then
        echo "✅ Domain is accessible for ACME challenges"
        # Cleanup test file
        docker compose run --rm --entrypoint="" certbot rm -f /var/www/certbot/.well-known/acme-challenge/test
    else
        echo "❌ Domain is not accessible for ACME challenges"
        echo "   Please ensure:"
        echo "   1. $DOMAIN points to this server's public IP"
        echo "   2. Port 80 is open and accessible from the internet"
        echo "   3. No firewall is blocking HTTP traffic"
        echo "   4. DNS has propagated (check: nslookup $DOMAIN)"
        
        # Show current status for debugging
        echo "   Debugging info:"
        echo "   - Testing local nginx response..."
        LOCAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/.well-known/acme-challenge/test" 2>/dev/null || echo "failed")
        echo "   - Local test result: $LOCAL_TEST"
        
        # Cleanup test file
        docker compose run --rm --entrypoint="" certbot rm -f /var/www/certbot/.well-known/acme-challenge/test 2>/dev/null || true
        
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborting certificate setup"
            return 1
        fi
    fi
    
    # Run certbot to get the certificate
    echo "🔒 Running certbot certificate request..."
    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        --verbose \
        -d "$DOMAIN"
    
    # Check if certificate was created
    if docker compose run --rm --entrypoint="" certbot test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
        echo "✅ Let's Encrypt certificate obtained successfully"
    else
        echo "❌ Certificate creation failed"
        echo "📋 Troubleshooting steps:"
        echo "   1. Check certbot logs: docker compose logs certbot"
        echo "   2. Verify domain DNS: nslookup $DOMAIN"
        echo "   3. Test HTTP access: curl -I http://$DOMAIN/.well-known/acme-challenge/"
        echo "   4. Check firewall settings"
        echo "   5. Try manual test: docker compose run --rm certbot certonly --manual -d $DOMAIN"
        return 1
    fi
}

# Function to update nginx config for Let's Encrypt
update_nginx_config() {
    echo "🔄 Updating Nginx configuration for Let's Encrypt..."
    
    # Restore original nginx.conf
    if [ -f nginx.conf.backup ]; then
        mv nginx.conf.backup nginx.conf
        echo "✅ Original nginx.conf restored"
    fi
    
    # Verify the configuration has the correct certificate paths
    if grep -q "/etc/nginx/ssl/" nginx.conf; then
        echo "⚠️  Configuration still has self-signed certificate paths, fixing..."
        sed -i.tmp "s|/etc/nginx/ssl/fullchain.pem|/etc/letsencrypt/live/$DOMAIN/fullchain.pem|g" nginx.conf
        sed -i.tmp "s|/etc/nginx/ssl/privkey.pem|/etc/letsencrypt/live/$DOMAIN/privkey.pem|g" nginx.conf
        rm -f nginx.conf.tmp
        echo "✅ Certificate paths updated"
    fi
    
    # Test nginx configuration
    if docker compose exec nginx nginx -t; then
        echo "✅ Nginx configuration is valid"
    else
        echo "❌ Nginx configuration has errors"
        return 1
    fi
    
    # Restart nginx to ensure it loads the new certificate
    echo "🔄 Restarting nginx to load Let's Encrypt certificate..."
    docker compose restart nginx
    
    # Wait for nginx to start
    sleep 10
    
    echo "✅ Nginx restarted with Let's Encrypt certificate"
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
    echo "  DOMAIN      Domain name (default: api.tictactoe.kauntalha.dev)"
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