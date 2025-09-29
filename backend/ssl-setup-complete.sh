#!/bin/bash

# Complete SSL Certificate Setup Script for api.tictactoe.kauntalha.dev
# This script handles the complete setup and management of Let's Encrypt certificates
# Consolidates all working fixes from setup-ssl.sh and fix-ssl.sh

set -e

DOMAIN="api.tictactoe.kauntalha.dev"
EMAIL="admin@kauntalha.dev"  # Change this to your actual email
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Complete SSL Certificate Setup for $DOMAIN..."

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
    
    # Backup original nginx.conf if not already backed up
    if [ ! -f nginx.conf.backup ]; then
        cp nginx.conf nginx.conf.backup
        echo "✅ nginx.conf backed up"
    fi
    
    # Update nginx.conf to use local SSL files initially
    sed -i.tmp 's|/etc/letsencrypt/live/api.tictactoe.kauntalha.dev/fullchain.pem|/etc/nginx/ssl/fullchain.pem|g' nginx.conf
    sed -i.tmp 's|/etc/letsencrypt/live/api.tictactoe.kauntalha.dev/privkey.pem|/etc/nginx/ssl/privkey.pem|g' nginx.conf
    rm -f nginx.conf.tmp
    
    # Start services
    docker compose up -d postgres nakama nginx
    sleep 10
    echo "✅ Services started with self-signed certificate"
}

# Function to test domain accessibility for ACME challenges
test_acme_accessibility() {
    echo "🧪 Testing domain accessibility for ACME challenges..."
    
    # Ensure the certbot webroot directory exists
    docker compose run --rm --entrypoint="" certbot sh -c "mkdir -p /var/www/certbot/.well-known/acme-challenge"
    
    # Create a test file for ACME challenge verification
    docker compose run --rm --entrypoint="" certbot sh -c 'echo "test-challenge-file-$(date +%s)" > /var/www/certbot/.well-known/acme-challenge/test'
    
    # Test if we can access the challenge file
    sleep 5
    if curl -f "http://$DOMAIN/.well-known/acme-challenge/test" >/dev/null 2>&1; then
        echo "✅ Domain is accessible for ACME challenges"
        # Cleanup test file
        docker compose run --rm --entrypoint="" certbot rm -f /var/www/certbot/.well-known/acme-challenge/test
        return 0
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
        
        return 1
    fi
}

# Function to obtain Let's Encrypt certificate
obtain_letsencrypt_cert() {
    echo "🔐 Obtaining Let's Encrypt certificate..."
    
    # Test domain accessibility first
    if ! test_acme_accessibility; then
        read -p "Domain test failed. Continue anyway? (y/n): " -n 1 -r
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
        
        # Show certificate details
        echo "📜 Certificate details:"
        docker compose run --rm --entrypoint="" certbot openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -subject -issuer -dates
        return 0
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

# Function to update nginx config for Let's Encrypt and restart
update_nginx_with_letsencrypt() {
    echo "🔄 Updating Nginx configuration for Let's Encrypt..."
    
    # Restore original nginx.conf
    if [ -f nginx.conf.backup ]; then
        cp nginx.conf.backup nginx.conf
        echo "✅ Original nginx.conf restored"
    fi
    
    # Double-check that the configuration has the correct certificate paths
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
    
    # Restart nginx to ensure it loads the new certificate (this was the key fix!)
    echo "🔄 Restarting nginx to load Let's Encrypt certificate..."
    docker compose restart nginx
    
    # Wait for nginx to start properly
    sleep 15
    
    echo "✅ Nginx restarted with Let's Encrypt certificate"
}

# Function to verify SSL certificate is working
verify_ssl_certificate() {
    echo "🔍 Verifying SSL certificate is properly loaded..."
    
    # Check what certificate nginx is currently serving
    CURRENT_CERT=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -subject 2>/dev/null || echo "Failed to get certificate")
    echo "Current certificate subject: $CURRENT_CERT"
    
    # Check certificate issuer
    CERT_ISSUER=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null || echo "Failed")
    echo "Certificate issuer: $CERT_ISSUER"
    
    if echo "$CERT_ISSUER" | grep -q "Let's Encrypt"; then
        echo "✅ SUCCESS: Nginx is serving Let's Encrypt certificate!"
        return 0
    elif echo "$CURRENT_CERT" | grep -q "Organization.*Organization"; then
        echo "❌ WARNING: Nginx is still serving self-signed certificate"
        return 1
    else
        echo "⚠️  UNKNOWN: Certificate status unclear"
        return 1
    fi
}

# Function to setup certificate renewal
setup_renewal() {
    echo "⏰ Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > renew-certs.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting certificate renewal at $(date)"
docker compose run --rm certbot renew --webroot --webroot-path=/var/www/certbot
docker compose restart nginx
echo "Certificate renewal completed at $(date)"
EOF
    
    chmod +x renew-certs.sh
    echo "✅ Renewal script created: renew-certs.sh"
    echo "📋 To setup automatic renewal, add this to your crontab:"
    echo "0 12 * * * $BACKEND_DIR/renew-certs.sh >> $BACKEND_DIR/certbot.log 2>&1"
}

# Function to test the complete setup
test_ssl_setup() {
    echo "🧪 Testing complete SSL setup..."
    
    # Wait for services to be fully ready
    sleep 10
    
    # Test HTTP to HTTPS redirect
    echo "Testing HTTP to HTTPS redirect..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" || echo "000")
    if [[ "$HTTP_STATUS" =~ ^(301|302)$ ]]; then
        echo "✅ HTTP redirect working (Status: $HTTP_STATUS)"
    else
        echo "❌ HTTP redirect failed (Status: $HTTP_STATUS)"
    fi
    
    # Test HTTPS with certificate verification
    echo "Testing HTTPS with certificate verification..."
    if curl -s -o /dev/null "https://$DOMAIN" 2>/dev/null; then
        echo "✅ HTTPS working with valid certificate"
    else
        echo "❌ HTTPS failed with certificate validation"
        
        # Test HTTPS ignoring certificate validation
        echo "Testing HTTPS ignoring certificate validation..."
        if curl -k -s -o /dev/null "https://$DOMAIN" 2>/dev/null; then
            echo "⚠️  HTTPS works but certificate validation fails"
        else
            echo "❌ HTTPS completely failed"
        fi
    fi
    
    # Final verification
    if verify_ssl_certificate; then
        echo "🎉 SSL setup completed successfully!"
        echo ""
        echo "🌐 Your Nakama backend is now accessible at:"
        echo "   https://$DOMAIN"
        echo ""
        echo "🔒 Certificate will auto-renew before expiration"
        echo "   Manual renewal: ./renew-certs.sh"
        return 0
    else
        echo "⚠️  SSL setup completed but certificate verification failed"
        echo "   You may need to wait a few minutes or restart nginx manually"
        echo "   Manual restart: docker compose restart nginx"
        return 1
    fi
}

# Function to fix existing setup (if certificate exists but not working)
fix_existing_ssl() {
    echo "🔧 Fixing existing SSL setup..."
    
    # Check if Let's Encrypt certificate exists
    if docker compose run --rm --entrypoint="" certbot test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
        echo "✅ Let's Encrypt certificate found"
        
        # Update nginx configuration and restart
        update_nginx_with_letsencrypt
        
        # Verify the fix worked
        if verify_ssl_certificate; then
            echo "🎉 SSL fix completed successfully!"
            return 0
        else
            echo "❌ SSL fix failed - certificate still not working"
            return 1
        fi
    else
        echo "❌ No Let's Encrypt certificate found"
        echo "   Please run the full setup first"
        return 1
    fi
}

# Main execution function
main() {
    echo "🏁 Starting complete SSL setup process..."
    echo ""
    
    # Check if this is a fix operation
    if docker compose run --rm --entrypoint="" certbot test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
        echo "🔍 Let's Encrypt certificate already exists"
        echo "Would you like to:"
        echo "1) Fix existing certificate loading (recommended if HTTPS not working)"
        echo "2) Generate new certificate (will replace existing)"
        echo "3) Exit"
        read -p "Enter choice (1-3): " -n 1 -r
        echo
        
        case $REPLY in
            1)
                fix_existing_ssl
                return $?
                ;;
            2)
                echo "Proceeding with new certificate generation..."
                ;;
            3)
                echo "Exiting..."
                return 0
                ;;
            *)
                echo "Invalid choice, exiting..."
                return 1
                ;;
        esac
    fi
    
    # Check if running on server with domain pointed to this machine
    read -p "Is $DOMAIN pointed to this server and accessible from the internet? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Production setup
        echo "📡 Setting up for production..."
        
        generate_selfsigned_cert
        start_services_initial
        
        if obtain_letsencrypt_cert; then
            update_nginx_with_letsencrypt
            setup_renewal
            test_ssl_setup
        else
            echo "❌ Certificate generation failed"
            return 1
        fi
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

# Command line options
case "${1:-}" in
    "--help"|"-h")
        echo "Complete SSL Certificate Setup Script"
        echo ""
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  --fix       Fix existing SSL certificate loading issues"
        echo "  --renew     Renew existing certificates"
        echo "  --test      Test current SSL setup"
        echo "  --verify    Verify certificate is properly loaded"
        echo "  --help      Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  DOMAIN      Domain name (default: api.tictactoe.kauntalha.dev)"
        echo "  EMAIL       Email for Let's Encrypt (default: admin@kauntalha.dev)"
        exit 0
        ;;
    "--fix")
        echo "🔧 Running SSL fix mode..."
        fix_existing_ssl
        ;;
    "--renew")
        echo "🔄 Renewing certificates..."
        cd "$BACKEND_DIR"
        if [ -f "./renew-certs.sh" ]; then
            ./renew-certs.sh
        else
            echo "❌ Renewal script not found. Please run the full setup first."
            exit 1
        fi
        ;;
    "--test")
        echo "🧪 Testing SSL setup..."
        test_ssl_setup
        ;;
    "--verify")
        echo "🔍 Verifying SSL certificate..."
        verify_ssl_certificate
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac