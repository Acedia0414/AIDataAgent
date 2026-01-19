# D365 Data Agent - VPS Deployment Guide

## Overview

This document covers the complete deployment of the D365 Data Agent to a Vultr VPS (Ubuntu 25.10, 8GB RAM, Singapore).

**VPS Details:**
- IP: `139.180.128.172`
- SSH alias: `vps`
- Project path: `/root/projects/d365-ai-agent/`
- App URL: http://139.180.128.172:3000

---

## Table of Contents

1. [SSH Configuration](#ssh-configuration)
2. [VPS Initial Setup](#vps-initial-setup)
3. [Daily Deployment](#daily-deployment)
4. [Database Setup](#database-setup)
5. [RAG Indexing](#rag-indexing)
6. [Monitoring & Logs](#monitoring--logs)
7. [Troubleshooting](#troubleshooting)
8. [Architecture Decisions](#architecture-decisions)

---

## SSH Configuration

### SSH Key Setup (Passwordless Login)

```bash
# Generate ED25519 key
ssh-keygen -t ed25519 -f ~/.ssh/vultr_vps -C "d365-vps"

# Copy to server
ssh-copy-id -i ~/.ssh/vultr_vps.pub root@139.180.128.172
```

### SSH Config (~/.ssh/config.d/vultr-vps)

```
Host vps
    HostName 139.180.128.172
    User root
    IdentityFile ~/.ssh/vultr_vps
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Enable config includes in `~/.ssh/config`:
```
Include config.d/*
```

### Test Connection
```bash
ssh vps
```

---

## VPS Initial Setup

### One-time setup script (scripts/vps-setup.sh):

```bash
#!/bin/bash
# Run on VPS: curl -fsSL <url> | bash

# Update system
apt update && apt upgrade -y

# Install MySQL 8
apt install -y mysql-server
systemctl enable mysql
systemctl start mysql

# Create database and user
mysql -e "CREATE DATABASE IF NOT EXISTS d365_data_agent;"
mysql -e "CREATE USER IF NOT EXISTS 'data_agent'@'%' IDENTIFIED BY 'ChangeMe123!';"
mysql -e "GRANT ALL PRIVILEGES ON d365_data_agent.* TO 'data_agent'@'%';"
mysql -e "FLUSH PRIVILEGES;"

# Enable remote MySQL access
sed -i 's/bind-address.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
systemctl restart mysql

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Install Ollama (for embeddings)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text
```

---

## Daily Deployment

### Quick Deploy (Recommended)

```bash
# From local machine
./scripts/deploy-to-vps.sh
```

This script:
1. Builds the project
2. Syncs files with progress bar
3. Restarts PM2
4. Shows status

### Manual Deployment

```bash
# Build locally
pnpm run build

# Sync files with progress
rsync -avz --progress --human-readable \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'server/database/rag-vectors.json' \
    --exclude 'Ax' \
    /Users/mac/d365-data-agent/ vps:/root/projects/d365-ai-agent/

# Restart on VPS
ssh vps 'cd /root/projects/d365-ai-agent && pm2 restart d365-agent'
```

---

## Database Setup

### Environment Variables

**Local .env** (connects to VPS remotely):
```
DATABASE_URL=mysql://data_agent:ChangeMe123!@139.180.128.172:3306/d365_data_agent
```

**Server .env** (connects locally):
```
DATABASE_URL=mysql://data_agent:ChangeMe123!@localhost:3306/d365_data_agent
```

### Run Migrations
```bash
ssh vps 'cd /root/projects/d365-ai-agent && pnpm run db:push'
```

---

## RAG Indexing

### Understanding RAG Status

RAG (Retrieval Augmented Generation) uses embeddings to find relevant tables:
- **Ready**: `indexed >= 50% of total tables`
- **Not Ready**: Uses keyword-based fallback (still works!)

### Triggering Indexing

```bash
# Via API
curl -X POST http://139.180.128.172:3000/api/trpc/metadata.indexForRag \
  -H "Content-Type: application/json" \
  -d '{"json":{}}'

# Monitor progress
ssh vps 'pm2 logs d365-agent'
```

### UI Progress Indicator

Go to **Metadata > RAG Search** tab to see real-time indexing progress with:
- Progress bar
- Tables indexed / total
- Ready status

### Keyword Fallback

When RAG isn't ready, the system uses keyword-based matching:
- Maps common terms like "customer", "vendor", "sales" to relevant tables
- Limits context to top 30 matching tables
- Still generates valid SQL queries

---

## Monitoring & Logs

### Live Logs (Streaming)
```bash
# All logs (stdout + stderr)
ssh vps 'pm2 logs d365-agent'

# Errors only
ssh vps 'pm2 logs d365-agent --err'

# Last N lines (snapshot)
ssh vps 'pm2 logs d365-agent --lines 50 --nostream'
```

### PM2 Status
```bash
ssh vps 'pm2 status'
ssh vps 'pm2 monit'  # Real-time monitoring dashboard
```

### Process Management
```bash
ssh vps 'pm2 restart d365-agent'   # Restart
ssh vps 'pm2 stop d365-agent'      # Stop
ssh vps 'pm2 start d365-agent'     # Start
ssh vps 'pm2 delete d365-agent'    # Remove
```

### Auto-start on Reboot
```bash
ssh vps 'pm2 startup && pm2 save'
```

---

## Troubleshooting

### Common Issues

#### 1. "Query contains forbidden keyword: CREATE"
**Fixed**: The SQL validator now uses word boundaries:
```typescript
// Before: "CREATEDDATETIME".includes("CREATE") === true ❌
// After: /\bCREATE\b/.test("CREATEDDATETIME") === false ✅
```

#### 2. "Unterminated string in JSON"
**Fixed**: Added fallback JSON parsing:
- Extracts JSON from markdown code blocks
- Handles loose JSON objects in LLM responses

#### 3. RAG not ready / Vector dimension mismatch
**Solution**: Clear vector files and re-index:
```bash
ssh vps 'rm -f /root/projects/d365-ai-agent/server/database/rag-vectors.json'
ssh vps 'pm2 restart d365-agent'
# Then trigger indexing via UI or API
```

#### 4. Multi-step queries failing
**Workaround**: Multi-step is temporarily disabled by default. Simple queries now use single-step flow which is faster and more reliable.

---

## Architecture Decisions

### Why VPS over Azure App Service?

We initially tried Azure App Service but encountered:
- Container exit code 1 with no useful logs
- SSH unreachable when container crashing
- Startup probe failures
- Limited debugging capabilities

**VPS advantages:**
- Full SSH access
- Direct log inspection
- Complete control over environment
- Ollama for local embeddings

### Why Ollama over LM Studio?

- **Server-compatible**: Runs headless on Ubuntu
- **Model**: `nomic-embed-text` for efficient embeddings
- **Port**: 11434 (default)

### Query Generation Flow

```
User Query
    │
    ▼
┌─────────────────────────────────────┐
│        Intent Classification        │
│   (GENERAL_QA / QUERY_REQUIRED)     │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│         Table Selection             │
│  ┌─────────────┐  ┌──────────────┐ │
│  │ RAG Search  │  │  Keyword     │ │
│  │ (if ready)  │  │  Fallback    │ │
│  └─────────────┘  └──────────────┘ │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│     LLM SQL Generation              │
│   (with table/field context)        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│     SQL Validation                  │
│  - Must start with SELECT           │
│  - No forbidden keywords            │
│    (DROP, DELETE, CREATE, etc.)     │
└─────────────────────────────────────┘
```

---

## Quick Reference Commands

```bash
# Deploy
./scripts/deploy-to-vps.sh

# SSH to server
ssh vps

# View logs
ssh vps 'pm2 logs d365-agent'

# Restart app
ssh vps 'pm2 restart d365-agent'

# Check status
ssh vps 'pm2 status'

# Upload metadata (from local)
node scripts/upload-metadata.mjs http://139.180.128.172:3000

# Trigger RAG indexing
curl -X POST http://139.180.128.172:3000/api/trpc/metadata.indexForRag -H "Content-Type: application/json" -d '{"json":{}}'
```

---

## Files Modified During Deployment

| File | Change |
|------|--------|
| `server/queryGenerator.ts` | Added keyword fallback, fixed CREATE detection, improved JSON parsing |
| `server/routers.ts` | Disabled auto multi-step routing |
| `server/metadata-rag-indexer.ts` | Changed to Ollama, added progress stats |
| `client/src/pages/Metadata.tsx` | Added RAG status indicator with live progress |
| `scripts/deploy-to-vps.sh` | New deployment script with progress |
| `.env` | Database URL updated for VPS |

---

*Last updated: 2026-01-14*
