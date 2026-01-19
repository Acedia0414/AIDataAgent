# VPS Setup Script (Full Stack + Ollama)

Copy and run this entire script on your VPS (`ssh root@139.180.128.172`).
It installs MySQL, Node.js 24, PM2, and Ollama with the required embedding model.

```bash
#!/bin/bash
set -e

# 1. System Updates & Essentials
echo "🚀 Updating system..."
apt update && apt upgrade -y
apt install -y curl git zip unzip mysql-server build-essential

# 2. Install Node.js 24 LTS
echo "📦 Installing Node.js 24..."
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
npm install -g pnpm pm2

# 3. Secure MySQL Setup
echo "🗄️ Configuring MySQL..."
# Allow remote access (optional but useful for DBeaver/Workbench)
sed -i 's/bind-address.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
systemctl restart mysql

# Initialize Database & User
# Replace 'ChangeMe123!' with a strong password
mysql -e "CREATE DATABASE IF NOT EXISTS d365_data_agent;"
mysql -e "CREATE USER IF NOT EXISTS 'data_agent'@'%' IDENTIFIED BY 'ChangeMe123!';"
mysql -e "GRANT ALL PRIVILEGES ON d365_data_agent.* TO 'data_agent'@'%';"
mysql -e "FLUSH PRIVILEGES;"

# 4. Install Ollama (AI Model Serving)
echo "🦙 Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# 5. Pull Embedding Model (Qwen2 0.5B or similar small specialized model)
# The user code references 'text-embedding-qwen3-embedding-0.6b'
# We will use a close equivalent available in Ollama library or 'nomic-embed-text' if easier.
# Let's try to pull 'bge-m3' or 'nomic-embed-text' which are great for RAG.
# However, to match the code exactly, we might need to adjust the code to point to Ollama.
# Let's install a standard supported embedding model first.
echo "📥 Pulling embedding model..."
ollama pull nomic-embed-text

echo "✅ Setup Complete!"
echo "------------------------------------------------"
echo "Database: d365_data_agent"
echo "User: data_agent / ChangeMe123!"
echo "Ollama: Running on port 11434"
echo "------------------------------------------------"
```

## Update Code for Ollama

Since your code currently points to `LM Studio` at port `1234` with a specific GGUF model path, we need to update `server/metadata-rag-indexer.ts` to use Ollama's API instead.

**Current Code:**
- URL: `http://127.0.0.1:1234/v1/embeddings`
- Model: `text-embedding-qwen3-embedding-0.6b...`

**Change to:**
- URL: `http://127.0.0.1:11434/api/embeddings` (Native Ollama) or `http://127.0.0.1:11434/v1/embeddings` (Ollama Compat)
- Model: `nomic-embed-text` (Standard, high quality)
