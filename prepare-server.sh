#!/bin/bash

cd /data/server || exit

rm -rf node_modules

echo "installing node modules"
npm install
npx tsc

node dist/index.js