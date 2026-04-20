#!/bin/bash

# HRM Backend Deployment Script for EC2
# Builds locally, transfers to EC2, and reloads on PM2
# Usage: ./deploy.sh
# Configuration
EC2_USER="ubuntu"
EC2_HOST="3.110.44.44"
EC2_PATH="/home/ubuntu/hrm"

set -e

echo "🚀 Deploying HRM Backend to EC2"
echo "EC2 Host: $EC2_USER@$EC2_HOST:$EC2_PATH"
echo ""

# Step 1: Build application locally
echo "🔨 Building application locally..."
npm run build

# Step 2: Transfer dist folder to EC2
echo "📦 Uploading dist to EC2..."
scp -r dist package.json .env $EC2_USER@$EC2_HOST:$EC2_PATH/

# Step 3: Run database migrations on EC2
# echo "🗄️  Running database migrations on EC2..."
# ssh $EC2_USER@$EC2_HOST "cd $EC2_PATH && npm run prisma:migrate:deploy"

# Step 4: Reload application with PM2
echo "🔄 Reloading application on PM2..."
ssh $EC2_USER@$EC2_HOST "cd $EC2_PATH && pm2 reload hrm-backend || pm2 start dist/src/main.js --name hrm-backend --watch"

# Step 5: Verify deployment
echo "✅ Verifying deployment..."
ssh $EC2_USER@$EC2_HOST "pm2 status"

echo ""
echo "✨ Deployment completed successfully!"
echo "Backend URL: http://$EC2_HOST:3000/api/v1"
