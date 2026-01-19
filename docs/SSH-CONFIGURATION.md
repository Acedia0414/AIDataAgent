# SSH Configuration Guide

This documents how SSH key-based authentication was set up for the Vultr VPS.

## Quick Commands

```bash
# Connect to VPS (no password needed)
ssh vps

# Copy files to VPS
scp myfile.txt vps:/root/

# Sync project to VPS
rsync -avz --exclude 'node_modules' ./ vps:/root/projects/d365-ai-agent/
```

---

## What Was Configured

### 1. SSH Key Generation

Generated an ED25519 key pair (more secure than RSA):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/vultr_vps -N "" -C "d365-vps"
```

This creates:
- **Private key:** `~/.ssh/vultr_vps` (never share this!)
- **Public key:** `~/.ssh/vultr_vps.pub` (safe to share)

### 2. Copy Public Key to Server

```bash
ssh-copy-id -i ~/.ssh/vultr_vps.pub root@139.180.128.172
```

This adds your public key to the server's `~/.ssh/authorized_keys`.

### 3. SSH Config File

Created `~/.ssh/config.d/vultr-vps` with:

```
Host vps
    HostName 139.180.128.172
    User root
    IdentityFile ~/.ssh/vultr_vps
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive yes
```

**What each setting does:**
| Setting | Purpose |
|---------|---------|
| `Host vps` | Alias - lets you type `ssh vps` instead of full IP |
| `HostName` | The actual server IP address |
| `User root` | Default username |
| `IdentityFile` | Which SSH key to use |
| `ServerAliveInterval 60` | Send keepalive every 60 seconds (prevents disconnection) |
| `ServerAliveCountMax 3` | Disconnect after 3 missed keepalives |
| `TCPKeepAlive yes` | Enable TCP-level keepalive |

### 4. Include Custom Configs

Added this line to `~/.ssh/config`:

```
Include ~/.ssh/config.d/*
```

This loads all config files from the `config.d` directory.

---

## Server Details

| Property | Value |
|----------|-------|
| **Alias** | `vps` |
| **IP Address** | 139.180.128.172 |
| **Username** | root |
| **SSH Key** | `~/.ssh/vultr_vps` |
| **Location** | Singapore |
| **Provider** | Vultr |
| **OS** | Ubuntu 25.10 x64 |
| **RAM** | 8 GB |
| **Storage** | 180 GB NVMe |

---

## Troubleshooting

### Connection keeps dropping
The `ServerAliveInterval` setting should fix this. If it still drops:
```bash
# Test with verbose output
ssh -vvv vps
```

### Permission denied (publickey)
```bash
# Check key permissions (must be 600)
chmod 600 ~/.ssh/vultr_vps

# Verify key is loaded
ssh-add -l

# Manually add key
ssh-add ~/.ssh/vultr_vps
```

### "Too many authentication failures"
```bash
# Specify identity explicitly
ssh -i ~/.ssh/vultr_vps root@139.180.128.172
```

### Want to add another server?
Create a new file in `~/.ssh/config.d/` like:
```
Host myserver
    HostName 1.2.3.4
    User ubuntu
    IdentityFile ~/.ssh/mykey
```

---

## File Locations

| File | Purpose |
|------|---------|
| `~/.ssh/vultr_vps` | Private key (keep secret!) |
| `~/.ssh/vultr_vps.pub` | Public key |
| `~/.ssh/config` | Main SSH config |
| `~/.ssh/config.d/vultr-vps` | VPS-specific config |
| `~/.ssh/known_hosts` | Trusted server fingerprints |

---

## Regenerate Keys (If Compromised)

```bash
# Generate new key
ssh-keygen -t ed25519 -f ~/.ssh/vultr_vps -N "" -C "d365-vps"

# Copy to server (requires password this one time)
ssh-copy-id -i ~/.ssh/vultr_vps.pub root@139.180.128.172
```
