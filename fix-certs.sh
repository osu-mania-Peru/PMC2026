#!/bin/bash
set -e

echo "=== Checking current cert state ==="
ls /etc/letsencrypt/live/

echo ""
echo "=== Renaming cert directory ==="
mv /etc/letsencrypt/live/perumaniacup.info-0001 /etc/letsencrypt/live/perumaniacup.info

echo "=== Renaming renewal config ==="
mv /etc/letsencrypt/renewal/perumaniacup.info-0001.conf /etc/letsencrypt/renewal/perumaniacup.info.conf

echo "=== Updating paths in renewal config ==="
sed -i 's/perumaniacup.info-0001/perumaniacup.info/g' /etc/letsencrypt/renewal/perumaniacup.info.conf

echo "=== Testing nginx config ==="
nginx -t

echo "=== Reloading nginx ==="
systemctl reload nginx

echo ""
echo "=== Done! Verifying ==="
ls /etc/letsencrypt/live/
systemctl status nginx --no-pager | head -5
