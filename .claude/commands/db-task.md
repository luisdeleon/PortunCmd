I need to work with the database. Before proceeding:

1. **Create a backup** per @docs/DATABASE_BACKUP.md:
   ```bash
   ./scripts/backup-database.sh before_[operation_name]
   ```

2. **Reference the schema** at @docs/SUPABASE_SCHEMA.md

3. **Follow RLS patterns** at @docs/SUPABASE_RLS_POLICIES.md

4. **Use migrations** for DDL operations via `mcp__supabase__apply_migration`

5. **Verify backup** after changes are complete
