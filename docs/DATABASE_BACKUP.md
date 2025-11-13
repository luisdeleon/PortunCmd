# Database Backup & Migration Safety Guide

## Overview

This guide provides procedures for backing up your Supabase database before performing migrations, schema changes, or data modifications. Following these procedures ensures you can always roll back to a known good state.

## Critical Rules

**⚠️ ALWAYS backup before:**
- Running database migrations
- Modifying table schemas
- Adding/removing columns or constraints
- Updating Row Level Security (RLS) policies
- Making bulk data changes
- Testing new features that modify data
- Deploying to production

**Never skip backups.** Recovery from data loss is expensive and time-consuming.

---

## Backup Methods

### Method 1: Supabase Dashboard (Recommended for Quick Backups)

Supabase Pro and higher plans include automatic daily backups. You can also create manual backups:

1. **Access Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Database Settings**
   - Navigate to **Settings** → **Database**
   - Scroll to **Database Backups** section

3. **Create Manual Backup**
   - Click **"Start a backup"**
   - Wait for backup to complete
   - Note the backup timestamp

4. **Download Backup (Pro/Team/Enterprise plans)**
   - Click download icon next to the backup
   - Save the `.sql.gz` file to a safe location

**Limitations:**
- Free tier: No manual backups available (use Method 2 or 3)
- Backup retention varies by plan
- May not include real-time data if database is actively changing

### Method 2: pg_dump via Supabase CLI (Recommended for Development)

Use the Supabase CLI to create local backups.

#### Prerequisites

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login
```

#### Create Backup

```bash
# Link to your project (first time only)
supabase link --project-ref your-project-ref

# Create timestamped backup
supabase db dump -f backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Or dump specific schemas
supabase db dump --schema public -f backups/backup_public_$(date +%Y%m%d_%H%M%S).sql
```

#### Backup Structure Options

```bash
# Full backup (schema + data)
supabase db dump -f backup_full.sql

# Schema only
supabase db dump --schema-only -f backup_schema.sql

# Data only
supabase db dump --data-only -f backup_data.sql

# Specific table
supabase db dump --table profile -f backup_profile.sql
```

### Method 3: Direct pg_dump (Advanced)

If you have direct PostgreSQL access, use `pg_dump`:

#### Get Connection Details

From Supabase Dashboard:
1. Go to **Settings** → **Database**
2. Copy connection details under **Connection String**

#### Create Backup

```bash
# Set connection details
export PGHOST="db.xxxxx.supabase.co"
export PGDATABASE="postgres"
export PGUSER="postgres"
export PGPASSWORD="your-db-password"
export PGPORT="5432"

# Create full backup
pg_dump \
  --format=custom \
  --file=backups/backup_$(date +%Y%m%d_%H%M%S).dump \
  --verbose \
  postgres

# Or SQL format (more readable)
pg_dump \
  --file=backups/backup_$(date +%Y%m%d_%H%M%S).sql \
  --verbose \
  postgres
```

#### Backup Options

```bash
# Full backup with compression
pg_dump --format=custom --compress=9 \
  -f backups/backup_compressed.dump postgres

# Schema only
pg_dump --schema-only \
  -f backups/backup_schema.sql postgres

# Specific schema
pg_dump --schema=public \
  -f backups/backup_public.sql postgres

# Exclude specific tables
pg_dump --exclude-table=visitor_record_logs \
  -f backups/backup_no_logs.sql postgres

# Include only specific tables
pg_dump --table=profile --table=role --table=profile_role \
  -f backups/backup_auth_tables.sql postgres
```

---

## Automated Backup Scripts

### Bash Script for Automated Backups

Create `scripts/backup-database.sh`:

```bash
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
    ls -t "${BACKUP_DIR}"/backup_*.sql* | tail -n +11 | xargs -r rm -v

    echo ""
    echo -e "${GREEN}Backup complete!${NC}"
    exit 0
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi
```

Make it executable:

```bash
chmod +x scripts/backup-database.sh
```

### Usage

```bash
# Simple backup
./scripts/backup-database.sh

# Backup with description
./scripts/backup-database.sh before_rbac_migration

# Before specific changes
./scripts/backup-database.sh before_adding_permissions_table
```

### Node.js Script Alternative

Create `scripts/backup-database.js`:

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = 'backups';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const description = process.argv[2] || 'manual';
const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}_${description}.sql`);

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('🔄 Starting database backup...');
console.log(`📅 Timestamp: ${timestamp}`);
console.log(`📝 Description: ${description}`);
console.log(`📁 Output: ${backupFile}\n`);

try {
  // Create backup
  console.log('⏳ Creating backup...');
  execSync(`supabase db dump -f "${backupFile}"`, { stdio: 'inherit' });

  // Get file size
  const stats = fs.statSync(backupFile);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Backup created: ${sizeMB} MB`);

  // Compress if gzip is available
  try {
    execSync('which gzip', { stdio: 'ignore' });
    console.log('🗜️  Compressing backup...');
    execSync(`gzip "${backupFile}"`, { stdio: 'inherit' });
    const compressedStats = fs.statSync(`${backupFile}.gz`);
    const compressedMB = (compressedStats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Compressed: ${compressedMB} MB`);
  } catch (e) {
    console.log('⚠️  gzip not available, skipping compression');
  }

  // Cleanup old backups (keep last 10)
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (backups.length > 10) {
    console.log('\n🧹 Cleaning up old backups...');
    backups.slice(10).forEach(backup => {
      fs.unlinkSync(backup.path);
      console.log(`   Removed: ${backup.name}`);
    });
  }

  console.log('\n✅ Backup complete!\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Backup failed!');
  console.error(error.message);
  process.exit(1);
}
```

Make it executable:

```bash
chmod +x scripts/backup-database.js
```

Add to `package.json`:

```json
{
  "scripts": {
    "db:backup": "node scripts/backup-database.js",
    "db:backup:before-migration": "node scripts/backup-database.js before_migration"
  }
}
```

Usage:

```bash
# Using npm script
pnpm db:backup
pnpm db:backup before_rbac_migration

# Or directly
node scripts/backup-database.js
node scripts/backup-database.js my_description
```

---

## Pre-Migration Checklist

Before running ANY migration, complete this checklist:

- [ ] **Create backup** using one of the methods above
- [ ] **Verify backup file exists** and is not empty
- [ ] **Test backup in staging** (if available)
- [ ] **Document the change** in migration notes
- [ ] **Review migration SQL** for syntax errors
- [ ] **Test rollback procedure** (dry run)
- [ ] **Notify team members** if working in shared environment
- [ ] **Schedule during low-traffic window** for production

### Migration Template

```bash
#!/bin/bash
# Migration: [Description]
# Date: $(date +%Y-%m-%d)
# Author: [Your Name]

set -e

DESCRIPTION="[short_description]"
MIGRATION_FILE="migrations/XXX_migration_name.sql"

# 1. Create backup
echo "Creating backup..."
./scripts/backup-database.sh "before_${DESCRIPTION}"

# 2. Review migration
echo "Migration to be applied:"
cat "${MIGRATION_FILE}"
read -p "Proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 1
fi

# 3. Apply migration
echo "Applying migration..."
supabase db push --file "${MIGRATION_FILE}"

# 4. Verify
echo "Verifying migration..."
# Add verification queries here

echo "Migration complete!"
```

---

## Restoration Procedures

### Restore from Supabase CLI

```bash
# Restore from SQL file
supabase db reset
supabase db push --file backups/backup_20231113_120000.sql

# Or using psql
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  -f backups/backup_20231113_120000.sql
```

### Restore using pg_restore

For custom format dumps:

```bash
# Restore custom format backup
pg_restore \
  --host=db.xxxxx.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --clean \
  --if-exists \
  --verbose \
  backups/backup_20231113_120000.dump
```

For SQL format:

```bash
# Restore SQL backup
psql \
  --host=db.xxxxx.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  -f backups/backup_20231113_120000.sql
```

### Point-in-Time Recovery (Pro/Team/Enterprise)

If you have a paid Supabase plan:

1. Go to Supabase Dashboard → **Settings** → **Database**
2. Find **Point in Time Recovery** section
3. Select date/time to restore to
4. Click **Restore** (creates a new project)
5. Test restored project
6. Migrate DNS/connections if needed

**Warning:** PITR creates a new project. Plan the cutover carefully.

---

## Backup Storage Best Practices

### Local Storage

```bash
# Create dedicated backup directory
mkdir -p backups/{daily,weekly,monthly,pre-migration}

# Organize backups
backups/
├── daily/           # Keep 7 days
├── weekly/          # Keep 4 weeks
├── monthly/         # Keep 12 months
└── pre-migration/   # Keep all until verified
```

### Remote Storage (Recommended)

**Option 1: Git LFS (for small databases)**

```bash
# Install Git LFS
git lfs install

# Track backup files
git lfs track "backups/*.sql.gz"

# Commit .gitattributes
git add .gitattributes
git commit -m "Track backups with Git LFS"
```

**Option 2: Cloud Storage**

```bash
# AWS S3
aws s3 cp backups/backup_latest.sql.gz \
  s3://your-bucket/portuncmd-backups/

# Google Cloud Storage
gsutil cp backups/backup_latest.sql.gz \
  gs://your-bucket/portuncmd-backups/

# Supabase Storage
supabase storage upload backups backup_latest.sql.gz
```

**Option 3: Automated Cloud Backup Script**

```bash
#!/bin/bash
# Upload backup to cloud storage

BACKUP_FILE="$1"
S3_BUCKET="your-backup-bucket"
S3_PATH="portuncmd/$(date +%Y/%m)"

# Create backup
./scripts/backup-database.sh pre_migration

# Upload to S3
aws s3 cp "${BACKUP_FILE}.gz" \
  "s3://${S3_BUCKET}/${S3_PATH}/" \
  --storage-class STANDARD_IA

echo "Backup uploaded to S3"
```

---

## Backup Verification

Always verify backups can be restored:

```bash
#!/bin/bash
# Test backup restoration in Docker

BACKUP_FILE="$1"

# Start temporary postgres container
docker run --name test-restore -e POSTGRES_PASSWORD=test -d postgres:15

# Wait for postgres to start
sleep 5

# Restore backup
docker exec -i test-restore psql -U postgres < "${BACKUP_FILE}"

# Verify restoration
docker exec test-restore psql -U postgres -c "\dt"

# Cleanup
docker stop test-restore
docker rm test-restore

echo "Backup verification complete"
```

---

## Recovery Plan

### Emergency Recovery Steps

1. **Stop all application servers**
   ```bash
   # Prevent further data corruption
   # Stop your app deployment
   ```

2. **Assess the damage**
   ```sql
   -- Check what tables/data are affected
   SELECT * FROM information_schema.tables WHERE table_schema = 'public';
   ```

3. **Identify the correct backup**
   ```bash
   # List available backups
   ls -lht backups/

   # Choose the most recent backup before the issue
   ```

4. **Test restore in staging first** (if available)
   ```bash
   # Never restore directly to production without testing
   ```

5. **Perform restoration**
   ```bash
   # Use appropriate restore method from above
   ```

6. **Verify data integrity**
   ```sql
   -- Run verification queries
   SELECT COUNT(*) FROM profile;
   SELECT COUNT(*) FROM property;
   -- Check critical records exist
   ```

7. **Restart application servers**

8. **Monitor for issues**

9. **Document incident**
   - What happened
   - When it happened
   - How it was fixed
   - How to prevent in future

---

## Backup Automation

### GitHub Actions Backup Workflow

Create `.github/workflows/backup-database.yml`:

```yaml
name: Database Backup

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:  # Allow manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install Supabase CLI
        run: npm install -g supabase

      - name: Create backup directory
        run: mkdir -p backups

      - name: Create database backup
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
        run: |
          supabase db dump -f backups/backup_$(date +%Y%m%d_%H%M%S).sql

      - name: Compress backup
        run: gzip backups/*.sql

      - name: Upload to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 cp backups/ s3://your-bucket/portuncmd-backups/$(date +%Y/%m)/ \
            --recursive \
            --storage-class STANDARD_IA

      - name: Cleanup local backups
        run: rm -rf backups/
```

---

## Backup Retention Policy

### Recommended Retention

- **Hourly** (if critical): Keep 24 hours
- **Daily**: Keep 7 days
- **Weekly**: Keep 4 weeks
- **Monthly**: Keep 12 months
- **Pre-Migration**: Keep until migration verified (minimum 30 days)
- **Yearly**: Keep 7 years (compliance)

### Cleanup Script

```bash
#!/bin/bash
# Cleanup old backups based on retention policy

BACKUP_DIR="backups"

# Keep last 7 daily backups
find "${BACKUP_DIR}/daily" -name "backup_*.sql.gz" -mtime +7 -delete

# Keep last 4 weekly backups (28 days)
find "${BACKUP_DIR}/weekly" -name "backup_*.sql.gz" -mtime +28 -delete

# Keep last 12 monthly backups (365 days)
find "${BACKUP_DIR}/monthly" -name "backup_*.sql.gz" -mtime +365 -delete

echo "Backup cleanup complete"
```

---

## Quick Reference

### Common Commands

```bash
# Create backup before migration
./scripts/backup-database.sh before_migration_name

# List recent backups
ls -lht backups/ | head

# Verify backup size
du -h backups/backup_latest.sql.gz

# Test backup integrity
gunzip -t backups/backup_latest.sql.gz

# Restore from backup
supabase db push --file backups/backup_20231113.sql
```

### Emergency Contacts

- **Supabase Support**: https://supabase.com/support
- **Database Admin**: [Your DBA contact]
- **Team Lead**: [Team lead contact]

---

## Additional Resources

- [Supabase Backup Documentation](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [RBAC Migration Guide](./RBAC_GUIDE.md#migration-path)

---

**Remember: A backup is only good if you've tested restoring from it!**
