#!/bin/bash

# Fix SSL Certificate Loading Script
# This script ensures Nginx is using the Let's Encrypt certificate

set -e

DOMAIN="api.tictactoe.kauntalha.dev"
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Fixing SSL certificate loading for $DOMAIN..."

cd "$BACKEND_DIR"

# Check if Let's Encrypt certificate exists
echo "🔍 Checking Let's Encrypt certificate..."
if docker compose run --rm --entrypoint="" certbot test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
    echo "✅ Let's Encrypt certificate found"
    
    # Show certificate details
    echo "📜 Certificate details:"
    docker compose run --rm --entrypoint="" certbot openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -subject -issuer -dates
else
    echo "❌ Let's Encrypt certificate not found"
    echo "Please run ./setup-ssl.sh first"
    exit 1
fi

# Check current nginx configuration
echo "🔍 Checking current nginx configuration..."
docker compose exec nginx nginx -t

# Check what certificate nginx is currently serving
echo "🔍 Checking currently served certificate..."
CURRENT_CERT=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -subject 2>/dev/null || echo "Failed to get certificate")
echo "Current certificate subject: $CURRENT_CERT"

# If it's still self-signed, let's fix it
if echo "$CURRENT_CERT" | grep -q "Organization.*Organization"; then
    echo "❌ Nginx is still serving self-signed certificate"
    
    echo "🔧 Fixing certificate configuration..."
    
    # Ensure nginx.conf has the correct certificate paths
    echo "🔍 Verifying nginx.conf certificate paths..."
    if grep -q "/etc/nginx/ssl/" nginx.conf; then
        echo "❌ nginx.conf still pointing to self-signed certificates"
        echo "🔄 Updating nginx.conf to use Let's Encrypt certificates..."
        
        sed -i.bak "s|/etc/nginx/ssl/fullchain.pem|/etc/letsencrypt/live/$DOMAIN/fullchain.pem|g" nginx.conf
        sed -i.bak "s|/etc/nginx/ssl/privkey.pem|/etc/letsencrypt/live/$DOMAIN/privkey.pem|g" nginx.conf
        
        echo "✅ nginx.conf updated"
    else
        echo "✅ nginx.conf already has correct certificate paths"
    fi
    
    # Restart nginx to load the new certificate
    echo "🔄 Restarting nginx with new certificate..."
    docker compose restart nginx
    
    # Wait for nginx to start
    sleep 10
    
else
    echo "✅ Nginx is serving Let's Encrypt certificate"
fi

# Test the configuration
echo "🧪 Testing SSL configuration..."

# Wait a bit more for nginx to fully start
sleep 5

# Test HTTP to HTTPS redirect
echo "Testing HTTP redirect..."
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
        echo "This suggests the certificate is still not properly loaded"
    else
        echo "❌ HTTPS completely failed"
    fi
fi

# Check certificate details being served
echo "🔍 Final certificate check..."
FINAL_CERT=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null || echo "Failed")
echo "Certificate issuer: $FINAL_CERT"

if echo "$FINAL_CERT" | grep -q "Let's Encrypt"; then
    echo "🎉 SUCCESS: Nginx is now serving Let's Encrypt certificate!"
else
    echo "❌ ISSUE: Nginx is still not serving Let's Encrypt certificate"
    echo ""
    echo "🔧 Manual troubleshooting steps:"
    echo "1. Check nginx logs: docker compose logs nginx"
    echo "2. Check certificate file permissions in container:"
    echo "   docker compose exec nginx ls -la /etc/letsencrypt/live/$DOMAIN/"
    echo "3. Manually restart nginx: docker compose restart nginx"
    echo "4. Check if certificate files are accessible:"
    echo "   docker compose exec nginx cat /etc/letsencrypt/live/$DOMAIN/fullchain.pem | head -5"
fi