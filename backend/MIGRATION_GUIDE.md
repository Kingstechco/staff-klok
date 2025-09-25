# Single-Tenant to Multi-Tenant Migration Guide

This guide walks you through migrating your existing single-tenant staff clocking application to the new multi-tenant architecture with contractor support.

## ⚠️ Important Prerequisites

### 1. Backup Your Database
```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/staff-clocking-app" --out=./backup-$(date +%Y%m%d-%H%M%S)

# Or if using MongoDB Atlas
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/staff-clocking-app" --out=./backup-$(date +%Y%m%d-%H%M%S)
```

### 2. Test in Development First
- Create a copy of your production database
- Run the migration on the copy first
- Verify all functionality works as expected

### 3. Plan Downtime
- The migration requires application downtime
- Estimated time: 10-30 minutes depending on data size
- Schedule during low-traffic periods

## Migration Process

### Step 1: Update Dependencies
```bash
npm install
```

### Step 2: Run the Migration Script
```bash
# Dry run (recommended first)
npm run migrate:single-to-multi -- --dry-run

# Actual migration
npm run migrate:single-to-multi
```

### Step 3: Verify Migration Results
The script will output detailed statistics and validation results:

```
📊 Migration Statistics:
========================
Tenants created: 1
Users updated: 25
Time entries updated: 1,247
Projects created: 2
Errors: 0

🎉 Migration completed successfully!
```

## What the Migration Does

### 1. Creates Default Tenant
- **Name**: "Default Organization"
- **Subdomain**: "default"
- **Business Type**: "office"
- **Plan**: "professional"
- **Features**: All features enabled

### 2. Updates User Records
- Adds `tenantId` to all existing users
- Sets default permissions based on roles
- Adds preference settings
- Converts single-tenant users to multi-tenant format

### 3. Updates Time Entries
- Adds `tenantId` for data isolation
- Converts old approval format to new workflow system
- Sets approval status based on existing data
- Adds contractor-specific billing fields

### 4. Creates Sample Projects (for contractors)
- Creates sample client contact if contractors exist
- Creates 2 sample projects for contractor time tracking
- Sets up approval workflows

## Post-Migration Steps

### 1. Update Environment Variables
Add these new variables to your `.env` file:
```bash
# Multi-tenant settings
DEFAULT_TENANT_SUBDOMAIN=default
TENANT_ISOLATION_ENABLED=true

# JWT should include tenant context
JWT_INCLUDE_TENANT=true

# Optional: Enable tenant creation API
ALLOW_TENANT_REGISTRATION=false
```

### 2. Update Application Routes
The application now supports tenant resolution via:
- **Subdomain**: `https://tenant.yourapp.com`
- **Custom Domain**: `https://tenant-domain.com`
- **Header**: `X-Tenant-ID: tenant-id`

### 3. Configure DNS (if using subdomains)
Set up wildcard DNS record:
```
*.yourapp.com → your-server-ip
```

### 4. Update Frontend URLs
Update your frontend to use the new tenant-aware URLs:
```javascript
// Old
const API_URL = 'https://api.yourapp.com';

// New
const API_URL = 'https://default.yourapp.com'; // or your tenant subdomain
```

### 5. Test All Functionality
- [ ] User authentication
- [ ] Time tracking
- [ ] Reporting
- [ ] Contractor features (if applicable)
- [ ] Admin functions
- [ ] Mobile app compatibility

## Troubleshooting

### Migration Fails with "Tenant Context Required"
**Solution**: Some requests may fail initially. Ensure your frontend sends the `X-Tenant-ID` header or uses the correct subdomain.

### Users Can't Login After Migration
**Solution**: 
1. Check that users have `tenantId` set
2. Ensure JWT tokens include tenant context
3. Verify tenant resolution middleware is working

### Time Entries Not Visible
**Solution**: Ensure all time entries have the correct `tenantId`. Run this query:
```javascript
db.timeentries.find({ tenantId: { $exists: false } }).count()
```

### Performance Issues
**Solution**: The migration creates comprehensive indexes, but you may need to:
1. Monitor query performance
2. Add additional indexes based on usage patterns
3. Consider database optimization

## Rollback Plan

If you need to rollback (not recommended after users start using multi-tenant features):

### Option 1: Restore from Backup
```bash
mongorestore --uri="mongodb://localhost:27017/staff-clocking-app" --drop ./backup-folder
```

### Option 2: Remove Multi-Tenant Fields (Advanced)
```javascript
// Remove tenantId from users
db.users.updateMany({}, { $unset: { tenantId: 1 } });

// Remove tenantId from time entries
db.timeentries.updateMany({}, { $unset: { tenantId: 1 } });

// Delete tenant records
db.tenants.deleteMany({});

// Delete projects
db.projects.deleteMany({});
```

## Support

If you encounter issues during migration:

1. Check the migration logs for specific errors
2. Verify database connectivity and permissions
3. Ensure all required environment variables are set
4. Review the validation output for data integrity issues

## Next Steps After Migration

### 1. Tenant Management
- Access admin panel at `https://default.yourapp.com/admin`
- Update tenant settings (business type, preferences)
- Configure subscription plan if needed

### 2. Contractor Setup (if applicable)
- Create contractor users
- Set up client contacts
- Create projects for time tracking
- Configure approval workflows

### 3. Advanced Configuration
- Set up custom domains for tenants
- Configure email notifications
- Set up integrations (if any)
- Customize business-specific settings

### 4. Monitoring
- Monitor application performance
- Check database query patterns
- Review user adoption metrics
- Set up alerts for system health

---

**Remember**: This migration is a significant architectural change. Take your time, test thoroughly, and have a rollback plan ready.