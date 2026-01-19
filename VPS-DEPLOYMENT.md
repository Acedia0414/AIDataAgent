# VPS Deployment Guide

## 1. Connect to Server
Run this in your terminal:
```bash
ssh root@139.180.128.172
```
*Password:* Copy it from the Vultr dashboard (click the "eye" icon next to Password).

## 2. Server Setup Script
Once you are logged in, copy and paste this entire block to install Node.js 24, pnpm, and PM2:

```bash
# Update and install basics
apt update && apt upgrade -y
apt install -y curl git unzip

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# Install PNPM and PM2
npm install -g pnpm pm2

# Verify
node -v
pnpm -v
```

## 3. Database Strategy
You have 8GB RAM, which is plenty.
- **Option A:** Continue using **Azure MySQL** (already set up). *Easiest.*
- **Option B:** Install **MySQL/MariaDB** on this VPS. *Cheapest.*

## 4. Deploying Code
Back on your local machine (not the server), we will use `rsync` to push code:
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' ./ root@139.180.128.172:/root/app
```

Then on server:
```bash
cd /root/app
pnpm install
pnpm run build
pm2 start dist/index.js --name "data-agent"
```
