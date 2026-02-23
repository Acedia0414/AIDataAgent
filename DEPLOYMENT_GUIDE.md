# D365 Data Agent Complete Deployment Guide

## 📋 Table of Contents
- [Environment Requirements](#environment-requirements)
- [Quick Start](#quick-start)
- [Detailed Deployment Steps](#detailed-deployment-steps)
- [Data Import](#data-import)
- [Configuration Guide](#configuration-guide)
- [Deployment Verification](#deployment-verification)
- [Common Issues](#common-issues)

---

## 🖥️ Environment Requirements

### Required Software
- **Node.js**: >= 18.0.0 (Recommended LTS version)
- **MySQL**: >= 8.0.0
- **Git**: Latest version
- **npm**: >= 8.0.0 or **pnpm**: >= 7.0.0

### Recommended Tools
- **VS Code**: For code editing
- **MySQL Workbench**: Database management
- **Postman**: API testing

---

## 🚀 Quick Start

### 1. Clone Project
```bash
git clone <your-repo-url>
cd d365-data-agent-master
```

### 2. Install Dependencies
```bash
npm install
# Or use pnpm
pnpm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env file to configure database connection, etc.
```

### 4. Initialize Database
```bash
npm run db:migrate
```

### 5. Import Data (Critical Steps)
```bash
# Import table metadata
node scripts/import-table-metadata.cjs

# Import enhanced metadata (including Labels and Enums)
node scripts/import-enhanced-metadata.cjs

# Import knowledge base
node scripts/import-table-knowledge-base.cjs

# Import labels
node scripts/import-labels.cjs
```

### 6. Start Application
```bash
npm run dev
```

Visit http://localhost:3000

---

## 📝 Detailed Deployment Steps

### Step 1: Environment Preparation

#### 1.1 Install Node.js
```bash
# Use nvm to install (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

#### 1.2 Install MySQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server

# macOS (using Homebrew)
brew install mysql

# Windows
# Download MySQL Community Server: https://dev.mysql.com/downloads/mysql/
```

#### 1.3 Configure MySQL
```sql
-- Login to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE d365_data_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional, recommended)
CREATE USER 'd365_agent'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON d365_data_agent.* TO 'd365_agent'@'localhost';
FLUSH PRIVILEGES;
```

### Step 2: Project Setup

#### 2.1 Clone and Install
```bash
# Clone project
git clone <your-repo-url>
cd d365-data-agent-master

# Install dependencies
npm install
```

#### 2.2 Environment Variable Configuration
Create `.env` file:

```env
# Database configuration
DATABASE_URL=mysql://username:password@localhost:3306/d365_data_agent
# Or configure separately
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=d365_data_agent

# OAuth configuration
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

# LLM configuration
LLM_PROVIDER=google_ai
LLM_API_KEY=your_api_key
LLM_MODEL=gemini-2.5-flash

# Application configuration
NODE_ENV=development
PORT=3000
```

### Step 3: Database Initialization

#### 3.1 Run Migrations
```bash
npm run db:migrate
# Or use Drizzle
npx drizzle-kit migrate
```

#### 3.2 Verify Table Structure
```sql
USE d365_data_agent;
SHOW TABLES;
```

You should see the following tables:
- users
- metadata_tables
- metadata_fields
- table_knowledge_base
- labels
- table_rules
- conversations
- messages
- query_history
- etc...

---

## 📊 Data Import

### 🎯 Prepare Data Files

Ensure the following files exist in `data/` directory:

```
data/
├── TableMetadata_Export.xlsx          # Table structure metadata
├── Table level knowledge base.xlsx     # Table-level knowledge base
├── labels.json                     # Field labels
└── field_metadata.json             # Field metadata (optional)
```

### 📋 Import Steps

#### 1. Import Table Metadata
```bash
node scripts/import-table-metadata.cjs
```

**Functionality**:
- Reads `TableMetadata_Export.xlsx`
- Parses table names, field names, data types, enum values
- Uses `ON DUPLICATE KEY UPDATE` to update existing data
- Updates `table_metadata` and `field_metadata` tables

**Verification**:
```sql
SELECT COUNT(*) FROM table_metadata;
SELECT COUNT(*) FROM field_metadata;
```

#### 2. Import Enhanced Metadata (including Labels and Enums)
```bash
node scripts/import-enhanced-metadata.cjs
```

**Functionality**:
- Reads `TableMetadata_Export.xlsx` (enhanced version)
- Imports table labels, field descriptions, business meanings
- Imports enum values and labels
- Updates `table_metadata`, `field_metadata`, `enum_values` tables

**Key Update Logic**:
```sql
-- Table label update
INSERT INTO table_metadata (table_name, table_label, table_description)
VALUES (?, ?, ?)
ON DUPLICATE KEY UPDATE 
  table_label = VALUES(table_label),
  table_description = VALUES(table_description),
  updated_at = CURRENT_TIMESTAMP;

-- Field label update
INSERT INTO field_metadata (table_name, field_name, field_label, field_description, data_type, string_length, is_nullable, is_primary_key)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE 
  field_label = VALUES(field_label),
  field_description = VALUES(field_description),
  data_type = VALUES(data_type),
  string_length = VALUES(string_length),
  is_nullable = VALUES(is_nullable),
  is_primary_key = VALUES(is_primary_key),
  updated_at = CURRENT_TIMESTAMP;
```

#### 3. Import Table Knowledge Base
```bash
node scripts/import-table-knowledge-base.cjs
```

**Functionality**:
- Reads `Table level knowledge base.xlsx`
- Imports table descriptions, business scenarios, usage instructions
- Updates `table_knowledge_base` table

**Excel Format Requirements**:
| TableName | Label | Scenario | Area | Description |
|-----------|--------|----------|------|------------|
| PurchTable | Purchase Orders | Manage purchase orders | Procurement | ... |

#### 4. Import Labels
```bash
node scripts/import-labels.cjs
```

**Functionality**:
- Reads `labels.json`
- Imports D365 label translations
- Updates `labels` table

**JSON Format**:
```json
[
  {
    "labelId": "PurchTable",
    "labelText": "Purchase orders",
    "language": "en-us"
  }
]
```

### 🔄 Data Update Mechanism

All import scripts use `ON DUPLICATE KEY UPDATE` mechanism:

- **Incremental Updates**: Only update changed fields
- **Idempotent Operations**: Multiple runs yield consistent results
- **Preserve Existing Data**: Does not delete existing records
- **Automatic Timestamps**: Record update times

---

## ⚙️ Configuration Guide

### Database Configuration

#### Complete Connection String
```env
DATABASE_URL=mysql://username:password@host:port/database?charset=utf8mb4
```

#### Separate Configuration
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=d365_data_agent
DB_PORT=3306
```

### OAuth Configuration

#### Google OAuth
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing project
3. Enable Google+ API
4. Create OAuth 2.0 client ID
5. Configure redirect URI: `http://localhost:3000/auth/callback`

```env
OAUTH_CLIENT_ID=your_google_client_id
OAUTH_CLIENT_SECRET=your_google_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
```

### LLM Configuration

#### Google AI Studio
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Get API Key
3. Configure model

```env
LLM_PROVIDER=google_ai
LLM_API_KEY=your_google_ai_api_key
LLM_MODEL=gemini-2.5-flash
```

#### OpenAI
```env
LLM_PROVIDER=openai
LLM_API_KEY=your_openai_api_key
LLM_MODEL=gpt-4
```

---

## ✅ Deployment Verification

### 1. Check Service Status
```bash
# Start application
npm run dev

# Check port
netstat -tlnp | grep :3000
```

### 2. Visit Key Pages

| Page | URL | Function |
|------|-----|------|
| Home | http://localhost:3000 | Chat interface |
| Metadata Management | http://localhost:3000/metadata | Upload and manage metadata |
| Table Rules | http://localhost:3000/table-rules | Manage table rules |
| System Settings | http://localhost:3000/settings | Configuration management |

### 3. Test Functionality

#### 3.1 Test Queries
Enter in chat interface:
```
Show recent 10 purchase orders
```

Expected results:
- Identify tables: PurchTable
- Generate SQL query
- Return query results

#### 3.2 Verify Data Import
```sql
-- Check table count
SELECT COUNT(*) as table_count FROM table_metadata;

-- Check field count
SELECT COUNT(*) as field_count FROM field_metadata;

-- Check knowledge base
SELECT COUNT(*) as kb_count FROM table_knowledge_base;

-- Check labels
SELECT COUNT(*) as label_count FROM labels;

-- Check rules
SELECT COUNT(*) as rule_count FROM table_rules;
```

#### 3.3 Verify Two-Stage Query Generation
Check log output:
```
[Stage 1] 🔍 Inferred tables before validation: PurchTable
[Stage 2] ✅ Generated SQL: SELECT TOP 10 ...
[✅ COMPLETED] Two-stage optimization completed successfully!
```

---

## 🚨 Common Issues

### Q1: Database Connection Failed
**Error**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Solution**:
1. Check if MySQL service is running
2. Verify database configuration in `.env`
3. Confirm database exists

```bash
# Start MySQL
sudo systemctl start mysql

# Check status
sudo systemctl status mysql
```

### Q2: Import Script Error
**Error**: `File not found: TableMetadata_Export.xlsx`

**Solution**:
1. Ensure `data/` directory exists
2. Check if file names are correct
3. Verify file format

```bash
# Create data directory
mkdir -p data

# Check files
ls -la data/
```

### Q3: OAuth Login Failed
**Error**: `redirect_uri_mismatch`

**Solution**:
1. Check redirect URI in Google Cloud Console
2. Confirm `OAUTH_REDIRECT_URI` in `.env`
3. Regenerate OAuth client

### Q4: LLM Call Failed
**Error**: `API key invalid`

**Solution**:
1. Verify API Key is correct
2. Check LLM provider configuration
3. Confirm API quota

### Q5: Query Generation Not Working
**Error**: `No valid tables from LLM`

**Solution**:
1. Check if `table_metadata` table has data
2. Verify `table_knowledge_base` table
3. Confirm two-stage optimization configuration

---

## 📞 Technical Support

### Log Locations
- **Application logs**: Console output
- **LLM logs**: `llm-logs/` directory
- **Database logs**: MySQL error logs
- **Query logs**: `query-logs/` directory

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run dev

# Or set environment variable
export DEBUG=app:*
```

### Performance Monitoring
```bash
# Check memory usage
npm run memory-check

# Check query cache
curl http://localhost:3000/api/cache/stats
```

---

## 📋 Deployment Checklist

### Pre-Deployment Checks
- [ ] Node.js >= 18.0.0
- [ ] MySQL >= 8.0.0
- [ ] Git repository cloned
- [ ] Dependencies installed
- [ ] Environment variables configured

### Data Import Checks
- [ ] `TableMetadata_Export.xlsx` exists
- [ ] `Table level knowledge base.xlsx` exists
- [ ] `labels.json` exists
- [ ] Table metadata imported
- [ ] Knowledge base imported
- [ ] Labels imported

### Functionality Verification Checks
- [ ] Application starts successfully
- [ ] Database connection works
- [ ] OAuth login works
- [ ] LLM calls succeed
- [ ] Query generation works
- [ ] Table Rules available

### Performance Checks
- [ ] Response time < 5 seconds
- [ ] Memory usage < 1GB
- [ ] Database queries optimized
- [ ] Cache mechanism works

---

## 📚 Reference Resources

- [D365 F&O Documentation](https://learn.microsoft.com/en-us/dynamics-365/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)

---

**🎉 After deployment is complete, you have a fully functional D365 Data Agent system!**
