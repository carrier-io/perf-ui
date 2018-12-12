#!/bin/bash
/usr/bin/supervisord
mkdir -p /tmp/reports/screenshots
mkdir -p /tmp/reports/lighthouse_pages

sleep 10

node /tests/test.js $@
