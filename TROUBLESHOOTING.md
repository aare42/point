# Production Import Troubleshooting Guide

## Issue: Topics not loading on production after import

### ✅ **FIXED: Export Function Bug**

**Root Cause Found**: The export function was using incorrect Prisma model names, causing topics to export as empty arrays.

**Problem**: Export showed `"topic": []` even when topics existed in production database
**Detection**: 
- Production export contains `"topic": []` 
- Other entities export correctly
- Local database has topics but export fails

**Fix Applied**: Updated `/src/app/api/admin/export-json/route.ts` to use correct Prisma model names.

### Solutions

#### 1. **Check Current Topics Status** (First Step)
```bash
# Visit your production admin panel
GET /api/admin/topics-status
```
This will show:
- How many topics currently exist
- Sample topics with details  
- Whether topics have valid data
- Orphaned topics without relationships

#### 2. **Force Import Topics** (Recommended)
```bash
# Use the enhanced import endpoint
POST /api/admin/import-topics-force?force=true
```
This will:
- Clear existing topics first
- Import all topics with relationships
- Provide detailed feedback on each topic

#### 3. **Schema Mismatch** (Less Likely Given Other Entities Work)
**Problem**: Production might be using SQLite schema instead of PostgreSQL
**Solution**:
```bash
# Switch to production schema
node scripts/db-sync.js switch-prod
npx prisma generate
npx prisma migrate deploy
```

#### 2. **User Authorization Issues**
**Problem**: Topics exist but user doesn't have permission to see them
**Detection**: 
- Admin panel shows no topics
- API returns empty array
- User role is not ADMIN

**Solution**:
- Ensure you're logged in as admin on production
- Check `/api/admin/promote` endpoint to become admin
- Verify user role in database

#### 3. **Duplicate Prevention**
**Problem**: Topics already exist with same slugs, so import skips them
**Detection**: 
- Import reports "0 new records created"
- But shows "X topics processed"

**Solution**:
- Check existing topics: `GET /api/admin/debug-import`
- Clear production database if needed
- Use different slugs for testing

#### 4. **Database Connection Issues**
**Problem**: Production database not accessible or misconfigured
**Detection**: 
- 500 errors on all database operations
- Connection timeout errors

**Solution**:
- Verify `DATABASE_URL` environment variable
- Check PostgreSQL service status
- Test connection with database client

## Debugging Steps

### Step 1: Test Production Access
```bash
node scripts/test-production.js
```

### Step 2: Check Database State
Visit production admin panel and check:
- `/admin` - Can you access admin panel?
- `/admin/topics` - Are topics visible?
- `/api/admin/debug-import` - Database counts and sample data

### Step 3: Manual Verification
1. Sign in to production as admin
2. Visit `/api/topics` - Check if API returns data
3. Visit `/knowledge-graph` - Visual check for topics
4. Try creating a test topic manually

### Step 4: Schema Verification
If the issue persists:
1. Export current production data
2. Switch to correct PostgreSQL schema
3. Redeploy application
4. Re-import data

## Emergency Reset Procedure

If production is completely broken:

1. **Backup current data**:
   ```bash
   # Download from /api/admin/export-json
   ```

2. **Reset schema**:
   ```bash
   node scripts/db-sync.js switch-prod
   npx prisma migrate reset --force
   ```

3. **Redeploy and re-import**:
   - Deploy with correct schema
   - Use import endpoint with backed up data

## Prevention

- Always use correct schema for environment
- Test imports on staging before production
- Keep regular database backups
- Monitor deployment logs for schema errors