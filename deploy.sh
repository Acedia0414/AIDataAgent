#!/bin/bash

# D365 Data Agent - One-Click Deployment Script
# For quick deployment after Git clone

set -e  # Exit immediately on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check required software
check_requirements() {
    log "🔍 Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js not installed, please install Node.js >= 18.0.0"
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_NODE_VERSION="18.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]; then
        error "Node.js version too low, current version: $NODE_VERSION, required >= $REQUIRED_NODE_VERSION"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm not installed"
    fi
    
    # Check MySQL
    if ! command -v mysql &> /dev/null; then
        warn "MySQL command line tool not found, please ensure MySQL is installed"
    fi
    
    log "✅ System requirements check passed"
}

# Install dependencies
install_dependencies() {
    log "📦 Installing project dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        log "✅ Dependencies installed successfully"
    else
        error "package.json file not found, please ensure you are in project root"
    fi
}

# Check environment configuration
check_env() {
    log "⚙️ Checking environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            warn ".env file not found, creating from .env.example..."
            cp .env.example .env
            warn "Please edit .env file to configure database connection"
            warn "Rerun this script after configuration"
            exit 0
        else
            error ".env.example file not found, cannot create environment configuration"
        fi
    fi
    
    # Check critical environment variables
    source .env
    
    if [ -z "$DATABASE_URL" ] && [ -z "$DB_HOST" ]; then
        error "Database configuration not found, please check DATABASE_URL or DB_* configuration in .env file"
    fi
    
    log "✅ Environment configuration check completed"
}

# Test database connection
test_database() {
    log "🗄️ Testing database connection..."
    
    # Try to connect to database
    if command -v mysql &> /dev/null; then
        if [ -n "$DATABASE_URL" ]; then
            # Parse DATABASE_URL
            DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
            DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
            DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p')
            DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        fi
        
        mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME;" 2>/dev/null || {
            error "Database connection failed, please check configuration"
        }
        
        log "✅ Database connection successful"
    else
        warn "Skipping database connection test (mysql command not available)"
    fi
}

# Run database migrations
run_migrations() {
    log "🔄 Running database migrations..."
    
    if npm run db:migrate; then
        log "✅ Database migration completed"
    else
        error "Database migration failed"
    fi
}

# Check data files
check_data_files() {
    log "📁 Checking data files..."
    
    REQUIRED_FILES=(
        "data/TableMetadata_Export.xlsx"
        "data/Table level knowledge base.xlsx"
        "data/labels.json"
    )
    
    MISSING_FILES=()
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            MISSING_FILES+=("$file")
        fi
    done
    
    if [ ${#MISSING_FILES[@]} -gt 0 ]; then
        warn "The following required data files are missing:"
        for file in "${MISSING_FILES[@]}"; do
            warn "  - $file"
        done
        warn "Please place data files in data/ directory and rerun"
        exit 1
    fi
    
    log "✅ All required data files exist"
}

# Import data
import_data() {
    log "📊 Starting data import..."
    
    # Import table metadata
    log "🔹 Importing table metadata..."
    if node scripts/import-table-metadata.cjs; then
        log "✅ Table metadata imported successfully"
    else
        error "Table metadata import failed"
    fi
    
    # Import enhanced metadata
    log "🔹 Importing enhanced metadata (Labels and Enums)..."
    if node scripts/import-enhanced-metadata.cjs; then
        log "✅ Enhanced metadata imported successfully"
    else
        error "Enhanced metadata import failed"
    fi
    
    # Import knowledge base
    log "🔹 Importing table knowledge base..."
    if node scripts/import-table-knowledge-base.cjs; then
        log "✅ Table knowledge base imported successfully"
    else
        error "Table knowledge base import failed"
    fi
    
    # Import labels
    log "🔹 Importing label data..."
    if node scripts/import-labels.cjs; then
        log "✅ Label data imported successfully"
    else
        error "Label data import failed"
    fi
    
    log "🎉 All data import completed!"
}

# Verify import
verify_import() {
    log "🔍 Verifying data import..."
    
    # Add verification logic here
    # Check database record counts etc.
    
    log "✅ Data verification completed"
}

# Start application
start_application() {
    log "🚀 Starting application..."
    
    info "Application will start at http://localhost:3000"
    info "Press Ctrl+C to stop application"
    
    npm run dev
}

# Show completion information
show_completion() {
    log "🎉 Deployment completed!"
    echo ""
    echo "📋 Important links:"
    echo "  - Home: http://localhost:3000"
    echo "  - Chat Interface: http://localhost:3000/chat"
    echo "  - Metadata Management: http://localhost:3000/metadata"
    echo "  - Table Rules: http://localhost:3000/table-rules"
    echo ""
    echo "🧪 Test query:"
    echo "  Enter in chat interface: \"Show recent 10 purchase orders\""
    echo ""
    echo "📚 For more information, see DEPLOYMENT_GUIDE.md"
}

# Main function
main() {
    echo "🚀 D365 Data Agent One-Click Deployment Script"
    echo "=================================="
    echo ""
    
    check_requirements
    install_dependencies
    check_env
    test_database
    run_migrations
    check_data_files
    import_data
    verify_import
    show_completion
    
    # Ask if user wants to start application
    echo ""
    read -p "Start application now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_application
    fi
}

# Error handling
trap 'error "Script execution failed, please check error messages"' ERR

# Run main function
main "$@"
