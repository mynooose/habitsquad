#!/bin/bash
# Run this on the GCP VM after setup-vm.sh
# Usage: ./deploy.sh <YOUR_VM_IP>
set -e

VM_IP=${1:-"YOUR_VM_IP"}
APP_DIR="/home/$USER/habitsquad"

echo "=== Deploying HabitSquad ==="

# Navigate to app
cd $APP_DIR

# Backend
echo "=== Setting up Backend ==="
cd backend
npm install --production
npx prisma generate
npx prisma db push

# Start backend with PM2
pm2 delete habitsquad-api 2>/dev/null || true
pm2 start src/index.js --name habitsquad-api
pm2 save

# Frontend
echo "=== Building Frontend ==="
cd ../frontend
npm install
NEXT_PUBLIC_API_URL="http://${VM_IP}/api" npm run build

# Start frontend with PM2
pm2 delete habitsquad-web 2>/dev/null || true
pm2 start npm --name habitsquad-web -- start -- -p 3000
pm2 save

# Auto-start on reboot
pm2 startup | tail -1 | bash

echo "=== Deploy complete! ==="
echo "Backend: http://${VM_IP}:3001"
echo "Frontend: http://${VM_IP}"
pm2 status
