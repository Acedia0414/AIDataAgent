#!/bin/bash
set -e

echo "🚀 VPS Full Setup Script"
echo "========================"
echo ""

# 1. System Updates & Essentials
echo "📦 [1/5] Updating system and installing essentials..."
apt update && apt upgrade -y
apt install -y curl git zip unzip build-essential

# 2. Install MySQL
echo "🗄️ [2/5] Installing MySQL..."
apt install -y mysql-server

# Allow remote access (for DBeaver/Workbench from your Mac)
sed -i 's/bind-address.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
systemctl restart mysql
systemctl enable mysql

# Initialize Database & User
# ⚠️ CHANGE THIS PASSWORD!
DB_PASSWORD="ChangeMe123!"
mysql -e "CREATE DATABASE IF NOT EXISTS d365_data_agent;"
mysql -e "CREATE USER IF NOT EXISTS 'data_agent'@'%' IDENTIFIED BY '${DB_PASSWORD}';"
mysql -e "GRANT ALL PRIVILEGES ON d365_data_agent.* TO 'data_agent'@'%';"
mysql -e "FLUSH PRIVILEGES;"
echo "   ✅ MySQL configured. Database: d365_data_agent, User: data_agent"

# 3. Install Node.js 24 LTS
echo "📦 [3/5] Installing Node.js 24..."
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
npm install -g pnpm pm2
echo "   ✅ Node $(node -v), pnpm $(pnpm -v)"

# 4. Install Ollama (AI Model Serving)
echo "🦙 [4/5] Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh
systemctl enable ollama

# 5. Pull Embedding Model
echo "📥 [5/5] Pulling embedding model (nomic-embed-text)..."
ollama pull nomic-embed-text

# 6. Open firewall ports
echo "🔥 Configuring firewall..."
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 3000/tcp    # App (dev)
ufw allow 3306/tcp    # MySQL (optional, for remote DB access)
ufw --force enable

echo ""
echo "=============================================="
echo "✅ SETUP COMPLETE!"
echo "=============================================="
echo ""
echo "Database:"
echo "  Host: localhost"
echo "  Port: 3306"
echo "  Database: d365_data_agent"
echo "  User: data_agent"
echo "  Password: ${DB_PASSWORD}"
echo ""
echo "DATABASE_URL for .env:"
echo "  mysql://data_agent:${DB_PASSWORD}@localhost:3306/d365_data_agent"
echo ""
echo "Ollama:"
echo "  Running on: http://localhost:11434"
echo "  Model: nomic-embed-text"
echo ""
echo "Next steps:"
echo "  1. cd /root/projects/d365-ai-agent"
echo "  2. pnpm install"
echo "  3. pnpm run build"
echo "  4. Create .env with DATABASE_URL"
echo "  5. pnpm run db:push"
echo "  6. pm2 start dist/index.js --name d365-agent"
echo ""
