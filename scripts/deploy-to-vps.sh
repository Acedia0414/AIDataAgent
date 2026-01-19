#!/bin/bash
# VPS Deployment Script with Progress
# Usage: ./scripts/deploy-to-vps.sh [--first-time]
#
# Options:
#   --first-time    Run first-time setup (SSH config, VPS initialization)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_DIR="/Users/mac/d365-data-agent"
VPS_IP="139.180.128.172"
VPS_HOST="vps"
VPS_PATH="/root/projects/d365-ai-agent"
SSH_KEY="$HOME/.ssh/vultr_vps"
SSH_CONFIG_DIR="$HOME/.ssh/config.d"
SSH_CONFIG_FILE="$SSH_CONFIG_DIR/vultr-vps"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          D365 Data Agent - VPS Deployment Script           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_ssh_config() {
    echo -e "${CYAN}Checking SSH configuration...${NC}"

    # Check if SSH key exists
    if [ ! -f "$SSH_KEY" ]; then
        echo -e "${RED}✗ SSH key not found at $SSH_KEY${NC}"
        echo -e "${YELLOW}Run with --first-time to set up SSH${NC}"
        return 1
    fi
    echo -e "${GREEN}  ✓ SSH key exists${NC}"

    # Check if config.d directory exists
    if [ ! -d "$SSH_CONFIG_DIR" ]; then
        echo -e "${YELLOW}  ! Creating $SSH_CONFIG_DIR${NC}"
        mkdir -p "$SSH_CONFIG_DIR"
    fi

    # Check if VPS config exists
    if [ ! -f "$SSH_CONFIG_FILE" ]; then
        echo -e "${RED}✗ SSH config not found at $SSH_CONFIG_FILE${NC}"
        echo -e "${YELLOW}Run with --first-time to set up SSH${NC}"
        return 1
    fi
    echo -e "${GREEN}  ✓ SSH config exists${NC}"

    # Check if main SSH config includes config.d
    if ! grep -q "Include config.d/\*" "$HOME/.ssh/config" 2>/dev/null; then
        echo -e "${YELLOW}  ! Adding Include directive to ~/.ssh/config${NC}"
        echo -e "Include config.d/*\n$(cat $HOME/.ssh/config 2>/dev/null || true)" > "$HOME/.ssh/config"
    fi
    echo -e "${GREEN}  ✓ SSH Include directive configured${NC}"

    # Test SSH connection
    if ssh -o BatchMode=yes -o ConnectTimeout=5 "$VPS_HOST" "echo ok" &>/dev/null; then
        echo -e "${GREEN}  ✓ SSH connection successful${NC}"
    else
        echo -e "${RED}✗ SSH connection failed${NC}"
        echo -e "${YELLOW}Try: ssh-copy-id -i $SSH_KEY.pub root@$VPS_IP${NC}"
        return 1
    fi

    echo ""
    return 0
}

setup_ssh_first_time() {
    echo -e "${CYAN}Setting up SSH for first time...${NC}"

    # Generate SSH key if not exists
    if [ ! -f "$SSH_KEY" ]; then
        echo -e "${YELLOW}Generating SSH key...${NC}"
        ssh-keygen -t ed25519 -f "$SSH_KEY" -C "d365-vps" -N ""
        echo -e "${GREEN}  ✓ SSH key generated${NC}"
    fi

    # Create config.d directory
    mkdir -p "$SSH_CONFIG_DIR"

    # Create VPS SSH config
    cat > "$SSH_CONFIG_FILE" << EOF
Host vps
    HostName $VPS_IP
    User root
    IdentityFile $SSH_KEY
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
EOF
    echo -e "${GREEN}  ✓ SSH config created at $SSH_CONFIG_FILE${NC}"

    # Add Include to main SSH config
    if ! grep -q "Include config.d/\*" "$HOME/.ssh/config" 2>/dev/null; then
        echo -e "Include config.d/*\n$(cat $HOME/.ssh/config 2>/dev/null || true)" > "$HOME/.ssh/config"
        echo -e "${GREEN}  ✓ Include directive added to ~/.ssh/config${NC}"
    fi

    # Copy SSH key to server
    echo -e "${YELLOW}Copying SSH key to server (you may need to enter password)...${NC}"
    ssh-copy-id -i "$SSH_KEY.pub" "root@$VPS_IP"

    echo -e "${GREEN}  ✓ SSH key copied to server${NC}"
    echo ""
}

run_vps_setup() {
    echo -e "${CYAN}Running VPS initial setup...${NC}"
    echo -e "${YELLOW}This will install MySQL, Node.js, pnpm, PM2, and Ollama${NC}"

    # Copy setup script to VPS and run it
    scp "$PROJECT_DIR/scripts/vps-setup.sh" "$VPS_HOST:/tmp/vps-setup.sh"
    ssh "$VPS_HOST" "chmod +x /tmp/vps-setup.sh && /tmp/vps-setup.sh"

    echo -e "${GREEN}  ✓ VPS setup complete${NC}"
    echo ""
}

# ============================================================================
# Main Script
# ============================================================================

print_header

# Parse arguments
FIRST_TIME=false
for arg in "$@"; do
    case $arg in
        --first-time)
            FIRST_TIME=true
            shift
            ;;
    esac
done

# First-time setup
if [ "$FIRST_TIME" = true ]; then
    setup_ssh_first_time

    echo -e "${YELLOW}Do you want to run VPS initial setup? (MySQL, Node.js, Ollama) [y/N]${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        run_vps_setup
    fi

    echo -e "${GREEN}First-time setup complete! Run again without --first-time to deploy.${NC}"
    exit 0
fi

# Check SSH config
if ! check_ssh_config; then
    exit 1
fi

# Step 1: Build
echo -e "${YELLOW}[1/5] Building project...${NC}"
cd "$PROJECT_DIR"
pnpm run build 2>&1 | tail -3
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 2: Sync files with progress
echo -e "${YELLOW}[2/5] Syncing files to VPS (with progress)...${NC}"
rsync -avz --progress --human-readable \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'server/database/rag-vectors.json' \
    --exclude 'Ax' \
    --exclude 'upload' \
    --exclude 'slides-images' \
    "$PROJECT_DIR/" "$VPS_HOST:$VPS_PATH/"

echo -e "${GREEN}✓ Files synced${NC}"
echo ""

# Step 3: Check if PM2 process exists, create if not
echo -e "${YELLOW}[3/5] Checking PM2 process...${NC}"
if ssh "$VPS_HOST" "pm2 describe d365-agent" &>/dev/null; then
    echo -e "${GREEN}  ✓ PM2 process exists, restarting...${NC}"
    ssh "$VPS_HOST" "cd $VPS_PATH && pm2 restart d365-agent --update-env"
else
    echo -e "${YELLOW}  ! PM2 process not found, creating...${NC}"
    ssh "$VPS_HOST" "cd $VPS_PATH && pm2 start dist/index.js --name d365-agent"
    ssh "$VPS_HOST" "pm2 save"
fi
echo -e "${GREEN}✓ Application running${NC}"
echo ""

# Step 4: Verify health
echo -e "${YELLOW}[4/5] Verifying application health...${NC}"
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$VPS_IP:3000/" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}  ✓ Application responding (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}  ✗ Application not responding (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}  Check logs: ssh vps 'pm2 logs d365-agent --lines 50'${NC}"
fi
echo ""

# Step 5: Show status
echo -e "${YELLOW}[5/5] Application status:${NC}"
ssh "$VPS_HOST" "pm2 status"
echo ""

# Final summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Deployment Complete! 🚀                       ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  App URL:  http://$VPS_IP:3000                      ║${NC}"
echo -e "${GREEN}║  Logs:     ssh vps 'pm2 logs d365-agent'                   ║${NC}"
echo -e "${GREEN}║  Status:   ssh vps 'pm2 status'                            ║${NC}"
echo -e "${GREEN}║  Restart:  ssh vps 'pm2 restart d365-agent'                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
