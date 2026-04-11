#!/bin/bash
set -e

echo "=== Renaming archive directory ==="
mv /etc/letsencrypt/archive/perumaniacup.info-0001 /etc/letsencrypt/archive/perumaniacup.info

echo "=== Updating symlinks in live dir ==="
cd /etc/letsencrypt/live/perumaniacup.info
ln -sf ../../archive/perumaniacup.info/cert1.pem cert.pem
ln -sf ../../archive/perumaniacup.info/chain1.pem chain.pem
ln -sf ../../archive/perumaniacup.info/fullchain1.pem fullchain.pem
ln -sf ../../archive/perumaniacup.info/privkey1.pem privkey.pem

echo "=== Verifying symlinks ==="
ls -la /etc/letsencrypt/live/perumaniacup.info/

echo ""
echo "=== Testing nginx ==="
nginx -t

echo ""
echo "=== Reloading nginx ==="
systemctl reload nginx

echo ""
echo "=== Now expanding cert with all domains ==="
certbot --nginx -d perumaniacup.info -d www.perumaniacup.info -d api.perumaniacup.info -d auth.perumaniacup.info -d api-staging.perumaniacup.info --expand
