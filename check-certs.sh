#!/bin/bash
# Check and renew certbot certificates on the VPS

echo "=== Current certificates ==="
sudo certbot certificates

echo ""
echo "=== Checking expiry dates ==="
for cert in /etc/letsencrypt/live/*/fullchain.pem; do
    domain=$(basename $(dirname "$cert"))
    expiry=$(openssl x509 -enddate -noout -in "$cert" 2>/dev/null | cut -d= -f2)
    days_left=$(( ( $(date -d "$expiry" +%s) - $(date +%s) ) / 86400 ))
    if [ $days_left -le 0 ]; then
        echo "EXPIRED: $domain (expired $expiry)"
    elif [ $days_left -le 30 ]; then
        echo "EXPIRING SOON: $domain ($days_left days left, expires $expiry)"
    else
        echo "OK: $domain ($days_left days left, expires $expiry)"
    fi
done

echo ""
read -p "Do you want to renew all certificates? [y/N] " answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
    sudo certbot renew
    echo ""
    echo "=== Reloading nginx ==="
    sudo systemctl reload nginx
    echo "Done."
fi
