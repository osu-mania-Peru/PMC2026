#!/bin/bash
set -e

echo "=== Archive directories ==="
ls /etc/letsencrypt/archive/

echo ""
echo "=== Archive perumaniacup.info contents ==="
ls /etc/letsencrypt/archive/perumaniacup.info/ 2>/dev/null || echo "(not found)"

echo ""
echo "=== Archive perumaniacup.info-0001 contents ==="
ls /etc/letsencrypt/archive/perumaniacup.info-0001/ 2>/dev/null || echo "(not found)"

echo ""
echo "=== Live symlinks ==="
ls -la /etc/letsencrypt/live/perumaniacup.info/

echo ""
echo "=== Renewal config ==="
cat /etc/letsencrypt/renewal/perumaniacup.info.conf
