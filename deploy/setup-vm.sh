#!/bin/bash
# Run this on a fresh Ubuntu 22.04 GCP VM
set -e

echo "=== Updating system ==="
sudo apt update && sudo apt upgrade -y

echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== Installing Nginx ==="
sudo apt install -y nginx

echo "=== Installing PM2 ==="
sudo npm install -g pm2

echo "=== Installing Git ==="
sudo apt install -y git

echo "=== Verifying ==="
node -v
npm -v
pm2 -v
nginx -v

echo "=== Setup complete! ==="
