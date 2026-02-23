# D365 Data Agent

🤖 AI-powered Microsoft Dynamics 365 F&O Intelligent Query Generation System

## 🚀 Quick Start

### One-Click Deployment (Recommended)

**Windows Users**:
```cmd
deploy.bat
```

**Linux/macOS Users**:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Manual Deployment

1. **Clone Project**
   ```bash
   git clone <your-repo-url>
   cd d365-data-agent-master
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env file to configure database connection
   ```

4. **Initialize Database**
   ```bash
   npm run db:migrate
   ```

5. **Import Data**
   ```bash
   node scripts/import-table-metadata.cjs
   node scripts/import-enhanced-metadata.cjs
   node scripts/import-table-knowledge-base.cjs
   node scripts/import-labels.cjs
   ```

6. **Start Application**
   ```bash
   npm run dev
   ```

Visit http://localhost:3000

---

## 📋 System Requirements

- **Node.js**: >= 18.0.0
- **MySQL**: >= 8.0.0
- **Memory**: >= 4GB RAM
- **Storage**: >= 10GB available space

---

## 📁 Data Preparation

Before deployment, please prepare the following data files:

| File | Purpose | Required |
|------|---------|----------|
| `data/TableMetadata_Export.xlsx` | Table structure and field information | 
| `data/Table level knowledge base.xlsx` | Table business scenarios and usage | 
| `data/labels.json` | D365 label translations | 

For detailed data preparation guide, see [DATA_PREPARATION_CHECKLIST.md](./DATA_PREPARATION_CHECKLIST.md)

---

## 🎯 Core Features

### 🤖 AI Query Generation
- **Natural Language to SQL**: Convert Chinese/English queries to D365 SQL
- **Two-Stage Optimization**: Smart table identification + detailed SQL generation
- **Context-Aware**: Optimize queries based on business scenarios

### 📊 Metadata Management
- **Table Structure Management**: View and manage D365 table structures
- **Field Details**: Field types, enum values, business meanings
- **Relationship Graph**: Visualize table relationships

### 📚 Knowledge Base
- **Table-Level Knowledge**: Business scenarios, usage instructions
- **Field Mappings**: User-validated field mappings
- **Smart Recommendations**: Table recommendations based on query history

### 📋 Table Rules
- **Business Rules**: Define query rules for specific tables
- **AI Guidance**: Rules are passed to AI for query optimization
- **Priority Management**: Support rule priority sorting

---

## 🌐 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend     │    │   Backend API  │    │   Database     │
│                │    │                │    │                │
│ • Chat UI      │◄──►│ • Query Gen    │◄──►│ • Metadata     │
│ • Metadata Mgmt│    │ • Two-Stage Opt│    │ • Knowledge    │
│ • Rules Mgmt   │    │ • AI Integration│    │ • Rules        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   AI Service   │
                    │                │
                    │ • Gemini       │
                    │ • OpenAI       │
                    │ • Custom LLM   │
                    └─────────────────┘
```

---

## 🔧 Configuration

### Environment Variables

```env
# Database Configuration
DATABASE_URL=mysql://username:password@localhost:3306/d365_data_agent

# OAuth Authentication
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

# LLM Configuration
LLM_PROVIDER=google_ai
LLM_API_KEY=your_api_key
LLM_MODEL=gemini-2.5-flash

# Application Configuration
NODE_ENV=development
PORT=3000
```

### Database Configuration

Supported databases:
- **MySQL** (Recommended)
- **PostgreSQL**
- **SQL Server**
- **SQLite**

### LLM Providers

- **Google AI Studio** (Gemini)
- **OpenAI** (GPT-4, GPT-3.5)
- **Azure OpenAI**
- **Custom LLM**

---

## 📖 Usage Guide

### 1. Basic Queries

Enter natural language queries in the chat interface:

```
Show recent 10 purchase orders
Find customers with balance greater than 1000
List all unshipped sales orders
```

### 2. Complex Queries

```
Show top 10 suppliers with highest purchase amount last month
Find Beijing customers and their unpaid orders
List all items with inventory below safety stock
```

### 3. Metadata Management

Visit http://localhost:3000/metadata:
- View D365 table structures
- Upload new metadata files
- Manage field mappings

### 4. Rules Management

Visit http://localhost:3000/table-rules:
- Create table-level business rules
- Set rule priorities
- Enable/disable rules

---

## 🔍 Troubleshooting

### Common Issues

**Q: Application startup failed**
```bash
# Check port usage
netstat -tlnp | grep :3000

# Check environment variables
cat .env
```

**Q: Database connection failed**
```bash
# Test database connection
mysql -h localhost -u username -p database_name

# Check database service
sudo systemctl status mysql
```

**Q: AI call failed**
- Check API Key configuration
- Verify network connection
- Check LLM logs

**Q: Query generation failed**
- Check if metadata is fully imported
- Verify knowledge base data
- Check two-stage optimization logs

### Log Locations

- **Application logs**: Console output
- **LLM logs**: `llm-logs/` directory
- **Database logs**: MySQL error logs
- **Query logs**: `query-logs/` directory

---

## 📚 Documentation

- [📖 Complete Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [📋 Data Preparation Checklist](./DATA_PREPARATION_CHECKLIST.md)
- [🔧 API Documentation](./docs/API.md)
- [🏗️ Architecture Design](./docs/ARCHITECTURE.md)

---

## 🤝 Contributing

1. Fork the project
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

### Development Environment Setup

```bash
# Install development dependencies
npm install --dev

# Run tests
npm test

# Code linting
npm run lint

# Build project
npm run build
```

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details

---

## 🆘 Support

### Technical Support

- 📧 Email: support@example.com
- 💬 Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)

### Community

- 📖 Documentation: [Project Wiki](https://github.com/your-repo/wiki)
- 🎥 Videos: [YouTube Channel](https://youtube.com/your-channel)
- 📱 WeChat Group: Scan QR code to join

---

## 🎯 Roadmap

### v2.0 (In Development)
- [ ] Multi-tenant support
- [ ] Advanced query analytics
- [ ] Performance optimization
- [ ] Mobile support

### v2.1 (Planned)
- [ ] Query template management
- [ ] Batch operation support
- [ ] Data visualization
- [ ] Permission management

### v3.0 (Future)
- [ ] Machine learning optimization
- [ ] Real-time data sync
- [ ] Cloud-native deployment
- [ ] Multi-language support

---

**🚀 Start Your D365 AI Query Journey!**
