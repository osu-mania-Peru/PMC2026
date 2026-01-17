#!/bin/bash
# Run with: sudo bash fix-502.sh

# Add error page config to each site
for conf in /etc/nginx/sites-enabled/api.perumaniacup.info \
            /etc/nginx/sites-enabled/api-staging.perumaniacup.info \
            /etc/nginx/sites-enabled/auth.perumaniacup.info; do

    # Check if already configured
    if grep -q "error_page 502" "$conf"; then
        echo "Already configured: $conf"
        continue
    fi

    # Add before the first "location /" block
    sed -i '/location \/ {/i\
    # Custom 502 error page\
    error_page 502 /502.html;\
    location = /502.html {\
        root /home/deploy/errors;\
        internal;\
    }\
' "$conf"

    echo "Updated: $conf"
done

# Test nginx config
nginx -t

# Reload if test passed
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "Nginx reloaded successfully"
else
    echo "Nginx config test failed!"
fi
