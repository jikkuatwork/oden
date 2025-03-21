#!/bin/bash
# Oden installer script for Unix-like systems (Linux/macOS)

set -e

# Configuration
GITHUB_USER="yourusername"
REPO_NAME="oden"
INSTALL_DIR="/usr/local/bin"
VERSION="latest"  # Can be set to specific version like "v0.3.0"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Convert architecture names
if [ "$ARCH" == "x86_64" ]; then
    ARCH="x86_64"
elif [[ "$ARCH" == arm* ]] || [[ "$ARCH" == aarch* ]]; then
    ARCH="arm64"
else
    echo -e "${RED}Unsupported architecture: $ARCH${NC}"
    exit 1
fi

# Map to proper asset name based on OS
if [ "$OS" == "darwin" ]; then
    ASSET_NAME="oden-${VERSION#v}-macos-${ARCH}"
    OS_PRETTY="macOS"
elif [ "$OS" == "linux" ]; then
    ASSET_NAME="oden-${VERSION#v}-linux-${ARCH}"
    OS_PRETTY="Linux"
else
    echo -e "${RED}Unsupported operating system: $OS${NC}"
    echo -e "${YELLOW}Please use the Windows installer script instead.${NC}"
    exit 1
fi

# Welcome message
echo -e "${BLUE}Installing Oden for $OS_PRETTY ($ARCH)...${NC}"

# Create temp directory
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Function to get latest release
get_latest_version() {
    if [ "$VERSION" == "latest" ]; then
        echo -e "${BLUE}Fetching latest release...${NC}"
        VERSION=$(curl -s "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME/releases/latest" | 
                 grep '"tag_name":' | 
                 sed -E 's/.*"([^"]+)".*/\1/')
        if [ -z "$VERSION" ]; then
            echo -e "${RED}Failed to fetch latest version.${NC}"
            exit 1
        fi
        echo -e "${GREEN}Latest version is $VERSION${NC}"
    fi
}

# Function to download the binary
download_binary() {
    URL="https://github.com/$GITHUB_USER/$REPO_NAME/releases/download/$VERSION/$ASSET_NAME"
    echo -e "${BLUE}Downloading from: $URL${NC}"
    
    # Download the binary
    if command -v curl &> /dev/null; then
        curl -L "$URL" -o "$TMP_DIR/oden"
    elif command -v wget &> /dev/null; then
        wget -O "$TMP_DIR/oden" "$URL"
    else
        echo -e "${RED}Neither curl nor wget found. Please install one of them.${NC}"
        exit 1
    fi
    
    # Make it executable
    chmod +x "$TMP_DIR/oden"
}

# Function to install the binary
install_binary() {
    echo -e "${BLUE}Installing to $INSTALL_DIR...${NC}"
    
    # Check if we need sudo
    if [ -w "$INSTALL_DIR" ]; then
        cp "$TMP_DIR/oden" "$INSTALL_DIR/oden"
    else
        echo -e "${YELLOW}Elevated permissions required to install to $INSTALL_DIR${NC}"
        sudo cp "$TMP_DIR/oden" "$INSTALL_DIR/oden"
    fi
    
    # Verify installation
    if [ -x "$INSTALL_DIR/oden" ]; then
        echo -e "${GREEN}Installation successful!${NC}"
        echo -e "${BLUE}Oden has been installed to: $INSTALL_DIR/oden${NC}"
    else
        echo -e "${RED}Installation failed.${NC}"
        exit 1
    fi
}

# Main execution flow
get_latest_version
download_binary
install_binary

echo -e "${GREEN}Oden is now installed!${NC}"
echo -e "${BLUE}Run 'oden help' to get started.${NC}"