#!/bin/bash

# Database Backup Script for PortunCmd
# Usage: ./scripts/backup-database.sh [description]

set -e  # Exit on error

# Configuration
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DESCRIPTION="${1:-manual}"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}_${DESCRIPTION}.sql"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo -e "${YELLOW}Starting database backup...${NC}"
echo "Timestamp: ${TIMESTAMP}"
echo "Description: ${DESCRIPTION}"
echo "Output file: ${BACKUP_FILE}"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI not found${NC}"
    echo "Install with: npm install -g supabase"
    exit 1
fi

# Create backup using Supabase CLI
echo -e "${YELLOW}Creating backup...${NC}"
if supabase db dump -f "${BACKUP_FILE}"; then
    echo -e "${GREEN}✓ Backup created successfully!${NC}"

    # Get file size
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "Backup size: ${SIZE}"

    # Compress backup (optional)
    if command -v gzip &> /dev/null; then
        echo -e "${YELLOW}Compressing backup...${NC}"
        gzip "${BACKUP_FILE}"
        COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
        echo -e "${GREEN}✓ Compressed to ${COMPRESSED_SIZE}${NC}"
        echo "Final file: ${BACKUP_FILE}.gz"
    fi

    # List recent backups
    echo ""
    echo "Recent backups:"
    ls -lht "${BACKUP_DIR}" | head -6

    # Cleanup old backups (keep last 10)
    echo ""
    echo -e "${YELLOW}Cleaning up old backups (keeping last 10)...${NC}"
    ls -t "${BACKUP_DIR}"/backup_*.sql* 2>/dev/null | tail -n +11 | xargs -r rm -v || true

    echo ""
    echo -e "${GREEN}Backup complete!${NC}"
    exit 0
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi
