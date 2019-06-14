#!/bin/bash
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
mkdir -p /tmp/reports/screenshots
mkdir -p /tmp/reports/lighthouse_pages

sleep 10

node /tests/test.js $@
