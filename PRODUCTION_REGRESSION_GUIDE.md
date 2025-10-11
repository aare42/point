# Production Topics Regression Guide

## 🚨 **Urgent Issue**: Topics disappeared after working yesterday

### Quick Diagnosis Steps

**1. Visit Production Debug Endpoint**
```
https://your-production-url.com/api/debug-prod
```
This will show:
- Analytics query (working) vs Display queries (failing)
- Exact error messages
- Data integrity check
- Sample topic data

**2. Check Recent Changes**
Since topics worked yesterday, check what changed:
- Recent deployments
- Database migrations
- Environment variable updates
- Schema changes

**3. Most Likely Causes**

#### A. **Prisma Client Cache Issue**
**Symptoms**: Analytics works, complex queries fail
**Fix**: 
```bash
# Redeploy to regenerate Prisma client
git commit --allow-empty -m "Force redeploy to clear Prisma cache"
git push
```

#### B. **Database Connection Pool Exhaustion**
**Symptoms**: Simple queries work, complex queries timeout
**Detection**: Check production logs for connection errors
**Fix**: Restart production service/database

#### C. **Recent Schema Migration**
**Symptoms**: Queries fail due to missing fields/relationships
**Detection**: Debug endpoint shows specific SQL errors
**Fix**: Run missing migrations or rollback

#### D. **Memory/Resource Issues**
**Symptoms**: Large queries fail, simple ones work
**Detection**: Production resource usage spike
**Fix**: Scale up resources or optimize queries

### Immediate Actions

1. **Check Debug Endpoint**: `/api/debug-prod` (most important)
2. **Check Production Logs**: Look for errors in the last 24 hours
3. **Verify Database Connection**: Ensure PostgreSQL is accessible
4. **Check Recent Deployments**: Any changes in the last day?

### Quick Fixes to Try

1. **Force Redeploy** (clears caches):
   ```bash
   git commit --allow-empty -m "Clear production cache"
   git push
   ```

2. **Clear Production Cache** (if using Redis/similar):
   - Restart cache service
   - Clear application cache

3. **Check Environment Variables**:
   - DATABASE_URL still correct?
   - No recent changes to connection string?

### Debugging Results Guide

**If debug shows:**
- ✅ Analytics works + ❌ Complex queries fail = **Prisma client issue**
- ✅ All queries work = **Frontend/caching issue** 
- ❌ All queries fail = **Database connection issue**
- ✅ Queries work but return empty = **Data filtering issue**

### Recovery Plan

1. **Immediate**: Use debug endpoint to identify exact issue
2. **Short-term**: Apply appropriate fix based on diagnosis
3. **Long-term**: Add monitoring to prevent similar issues

---

## Debug Commands

```bash
# Check debug endpoint
curl https://your-site.com/api/debug-prod | jq

# Force redeploy (Railway/Vercel)
git commit --allow-empty -m "Force production rebuild"
git push

# Check recent git changes
git log --oneline -10
```

The debug endpoint will give us the exact error message and help identify whether it's a connection, query, or data issue.