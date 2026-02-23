#!/bin/bash
set -e

# --- Configuration ---
SSH_HOST="gcp-stocks-vm"  # SSH config hostname (from ~/.ssh/config)
REMOTE_REPO_PATH="/opt/alg-discovery"  # Repository path on GCP VM
# -----------------------------------------------------------------

echo "Attempting to connect to GCP instance via SSH config: $SSH_HOST"
echo "Using SSH config entry which handles authentication automatically..."

# Use SSH config hostname (handles authentication via ~/.ssh/config)
SSH_CMD="ssh $SSH_HOST"

# Use a 'heredoc' to send multiple commands over SSH
$SSH_CMD << EOF
  echo "Executing commands on remote server..."
  
  # Find the repository directory
  echo "Searching for alg-discovery repository..."
  REPO_PATH=""
  
  # Check common locations
  if [ -d "/opt/alg-discovery" ]; then
    REPO_PATH="/opt/alg-discovery"
  elif [ -d "\$HOME/alg-discovery" ]; then
    REPO_PATH="\$HOME/alg-discovery"
  elif [ -d "/home/akm551995/alg-discovery" ]; then
    REPO_PATH="/home/akm551995/alg-discovery"
  else
    echo "Searching in /opt/..."
    ls -la /opt/ | grep alg || echo "Not found in /opt/"
    echo "Searching in home directory..."
    ls -la \$HOME | grep alg || echo "Not found in home"
    echo "ERROR: alg-discovery repository not found in common locations."
    exit 1
  fi
  
  echo "Found repository at: \$REPO_PATH"
  cd "\$REPO_PATH"
  echo "Current directory: \$(pwd)"

  # Pull latest changes from origin/main
  echo "Pulling latest changes from origin/main..."
  git pull origin main

  # Run the production deployment script
  echo "Running production deployment script..."
  ./scripts/deploy-from-git.sh prod

  # Verify deployment with a health check
  echo "Verifying deployment with health check..."
  if curl -sf http://localhost/health >/dev/null; then
    echo "Health check passed."
  else
    echo "Health check failed - please verify container manually."
  fi

  echo "Remote deployment commands finished."
EOF

echo "SSH connection attempt finished. Check your GCP instance for deployment status."
