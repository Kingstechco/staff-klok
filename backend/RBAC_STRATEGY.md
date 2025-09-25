# Role-Based Access Control (RBAC) Strategy
## Staff Clocking Application

### Overview
This document outlines the comprehensive RBAC implementation for the Staff Clocking Application, ensuring secure access control based on user roles while providing appropriate functionality for each user type.

---

## Role Definitions & Permissions

### 🟢 **Staff Role** 
**Purpose**: Front-line employees who need to track their time and access their own data

**Core Permissions**:
- ✅ Clock in/out functionality
- ✅ View own time entries
- ✅ View own schedule (assigned shifts only)
- ✅ Access personal dashboard with own statistics
- ✅ Download own timesheets
- ✅ View own payroll summary
- ✅ Update own profile (limited fields)
- ✅ Change own PIN

**Restrictions**:
- ❌ Cannot view other employees' data
- ❌ Cannot access organization-wide statistics
- ❌ Cannot create, modify, or delete shifts
- ❌ Cannot approve time entries
- ❌ Cannot manage other users
- ❌ Cannot access administrative reports

**API Endpoints**:
```
GET /api/staff/time-entries       - Own time entries
GET /api/staff/schedule           - Own schedule
GET /api/staff/payroll-summary    - Own pay data
GET /api/staff/timesheet/download - Own timesheet export
GET /api/staff/profile            - Own profile (read-only)
GET /api/staff/stats              - Own work statistics
POST /api/time-entries/clock-in   - Clock in
POST /api/time-entries/clock-out  - Clock out
GET /api/dashboard/user           - Personal dashboard
```

### 🟡 **Manager Role**
**Purpose**: Team leaders who need to manage schedules and oversee employee time tracking

**Core Permissions**:
- ✅ All staff permissions
- ✅ View all employee time entries
- ✅ Approve/reject time entries
- ✅ Create, modify, delete shifts
- ✅ Manage shift templates
- ✅ View organization-wide dashboard
- ✅ Generate team reports
- ✅ View all employee schedules
- ✅ Access analytics for their department

**Restrictions**:
- ❌ Cannot create/delete users
- ❌ Cannot change user roles
- ❌ Cannot access system-wide exports (limited to department data)
- ❌ Cannot reset user PINs

**API Endpoints**:
```
All staff endpoints plus:
GET /api/time-entries            - All time entries
PUT /api/time-entries/:id        - Edit time entries
PATCH /api/time-entries/:id/approve - Approve entries
GET /api/schedule/shifts         - All shifts
POST /api/schedule/shifts        - Create shifts
PUT /api/schedule/shifts/:id     - Update shifts
DELETE /api/schedule/shifts/:id  - Delete shifts
GET /api/dashboard/stats         - Organization stats
GET /api/analytics/*             - Analytics access
```

### 🔴 **Admin Role**
**Purpose**: System administrators with full access to all functionality

**Core Permissions**:
- ✅ All manager permissions
- ✅ Full user management (CRUD operations)
- ✅ Change user roles and permissions
- ✅ Reset user PINs
- ✅ Access all system exports
- ✅ View audit logs
- ✅ Bypass location restrictions
- ✅ System configuration access

**No Restrictions**: Full access to all endpoints

**API Endpoints**:
```
All manager endpoints plus:
POST /api/users                  - Create users
PUT /api/users/:id               - Update users
DELETE /api/users/:id            - Delete users
PATCH /api/users/:id/reset-pin   - Reset PINs
GET /api/exports/*               - All export functions
GET /api/audit/*                 - Audit logs (if implemented)
```

---

## Security Implementation

### 1. **Authentication Layer**
```typescript
// All protected routes require valid JWT token
router.use(authenticate);
```

### 2. **Authorization Layer**
```typescript
// Role-based route protection
router.get('/admin-only', authorize(['admin']), handler);
router.get('/management', authorize(['admin', 'manager']), handler);
```

### 3. **Data Filtering**
```typescript
// Controller-level data filtering based on role
if (user.role === 'staff') {
  filter.userId = user._id; // Only own data
}
```

### 4. **Audit Logging**
```typescript
// Comprehensive audit trail for all actions
auditLog({
  action: 'user_created',
  resource: 'user',
  severity: 'medium'
})
```

---

## Security Measures Implemented

### ✅ **Fixed Security Issues**

1. **Schedule Access Control**
   - Staff can now only view their own shifts
   - Added role-based filtering in `getShifts` controller
   - Proper authorization on shift templates and utilization reports

2. **Dashboard Data Protection**
   - Organization stats restricted to admin/manager only
   - Staff redirected to personal dashboard endpoint
   - Sensitive company data no longer exposed to staff

3. **Time Entry Authorization**
   - Enhanced ownership verification
   - Staff cannot access other employees' time entries
   - Proper role-based filtering in list endpoints

4. **Audit Logging System**
   - Comprehensive logging of all administrative actions
   - Security violation tracking
   - IP and user agent logging for forensics

### 🔐 **Additional Security Features**

1. **Self-Service Staff Portal**
   - Dedicated `/api/staff/*` endpoints for staff-only functions
   - Automatic data filtering by user ID
   - Download capabilities for personal data

2. **Multi-Level Protection**
   - Route-level authorization
   - Controller-level data filtering
   - Database-level access control

3. **Security Monitoring**
   - Failed login attempt logging
   - Unauthorized access attempt tracking
   - Role escalation detection

---

## Department-Level Access Control (Future Enhancement)

### Strategy for Department Isolation

1. **User Model Enhancement**
   ```typescript
   // Add department field to user model
   department: {
     type: String,
     required: true,
     enum: ['Sales', 'Operations', 'Management', 'IT', 'HR']
   }
   ```

2. **Manager Department Restriction**
   ```typescript
   // Restrict managers to their own department
   if (user.role === 'manager') {
     filter.department = user.department;
   }
   ```

3. **Cross-Department Override**
   ```typescript
   // Admin can override department restrictions
   if (user.role === 'admin' || req.query.allDepartments === 'true') {
     // Allow cross-department access
   }
   ```

---

## Data Access Patterns

### **Staff Data Access**
- **Scope**: Personal data only
- **Pattern**: `{ userId: currentUser._id }`
- **Exports**: Personal timesheets, pay stubs
- **Analytics**: Personal work statistics

### **Manager Data Access**
- **Scope**: Department-wide data (future: own department only)
- **Pattern**: `{ department: currentUser.department }` (future)
- **Exports**: Team reports, department analytics
- **Analytics**: Team performance, utilization reports

### **Admin Data Access**
- **Scope**: Organization-wide data
- **Pattern**: No restrictions
- **Exports**: System backups, full reports
- **Analytics**: Company-wide insights

---

## Best Practices Implemented

1. **Principle of Least Privilege**
   - Users only get minimum permissions required
   - Role-based feature access
   - Data filtering at controller level

2. **Defense in Depth**
   - Multiple layers of security checks
   - Route + Controller + Database level protection
   - Input validation and sanitization

3. **Audit Trail**
   - All administrative actions logged
   - Security events tracked
   - Forensic capabilities for security incidents

4. **Separation of Concerns**
   - Clear role boundaries
   - Dedicated endpoints for different user types
   - Modular permission system

---

## Testing RBAC Implementation

### **Staff User Testing**
```bash
# Test staff can only access own data
curl -H "Authorization: Bearer $staff_token" /api/time-entries
# Should only return staff user's entries

# Test staff cannot access admin endpoints  
curl -H "Authorization: Bearer $staff_token" /api/users
# Should return 403 Forbidden
```

### **Manager User Testing**
```bash
# Test manager can access all time entries
curl -H "Authorization: Bearer $manager_token" /api/time-entries
# Should return all entries

# Test manager cannot create users
curl -X POST -H "Authorization: Bearer $manager_token" /api/users
# Should return 403 Forbidden
```

### **Admin User Testing**
```bash
# Test admin has full access
curl -H "Authorization: Bearer $admin_token" /api/users
curl -X POST -H "Authorization: Bearer $admin_token" /api/users
# Should succeed
```

---

## Monitoring & Alerting

### **Security Alerts**
- Failed login attempts (>5 in 15 minutes)
- Unauthorized access attempts
- Role escalation attempts
- Bulk data downloads
- After-hours administrative actions

### **Audit Reports**
- Daily security summary
- Weekly access pattern analysis
- Monthly permission usage review
- Quarterly security assessment

---

## Compliance & Governance

### **Data Protection**
- GDPR-compliant data access
- Right to data portability (staff data export)
- Data retention policies
- Secure data deletion

### **Labor Law Compliance**
- Accurate time tracking
- Overtime calculation transparency
- Pay period data integrity
- Employee data privacy

---

This RBAC implementation provides a robust, secure, and scalable access control system that protects sensitive data while enabling appropriate functionality for each user role.