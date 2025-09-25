# StaffClock Pro API Documentation

## Overview
Complete REST API for the StaffClock Pro time tracking system. All endpoints require authentication unless specified otherwise.

## Authentication
- **JWT Bearer Token**: Include in `Authorization` header as `Bearer <token>`
- **PIN-based login**: Available for quick clock-in/out operations

## Base URL
```
http://localhost:5000/api
```

## Error Handling
All errors return JSON in the following format:
```json
{
  "error": "Error message",
  "details": "Additional details (development only)"
}
```

---

## Authentication Endpoints

### POST /auth/login
Login with email and PIN
```json
// Request
{
  "email": "user@example.com",
  "pin": "1234"
}

// Response
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "staff",
    "department": "Sales"
  }
}
```

### POST /auth/quick-login
Quick clock-in with PIN only
```json
// Request
{
  "pin": "1234"
}

// Response
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "role": "staff"
  }
}
```

### GET /auth/profile
Get current user profile (requires auth)

### PUT /auth/profile
Update user profile (requires auth)

### PUT /auth/change-pin
Change user PIN (requires auth)
```json
{
  "currentPin": "1234",
  "newPin": "5678"
}
```

---

## User Management (Admin/Manager Only)

### GET /users
Get all users with optional filtering
- Query params: `department`, `role`, `isActive`

### GET /users/:id
Get specific user

### POST /users
Create new user
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "pin": "4567",
  "role": "staff",
  "department": "Sales",
  "position": "Sales Associate",
  "hourlyRate": 15.00,
  "overtimeRate": 1.5
}
```

### PUT /users/:id
Update user

### DELETE /users/:id
Deactivate user (soft delete)

### POST /users/:id/reset-pin
Reset user PIN (admin only)

---

## Time Tracking

### POST /time-entries/clock-in
Clock in (requires auth)
```json
{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "123 Main St"
  },
  "notes": "Starting shift"
}
```

### POST /time-entries/clock-out
Clock out (requires auth)
```json
{
  "notes": "Ending shift"
}
```

### POST /time-entries/break/start
Start break (requires auth)

### POST /time-entries/break/end
End break (requires auth)

### GET /time-entries
Get time entries with filtering
- Query params: `userId`, `startDate`, `endDate`, `status`, `isApproved`

### GET /time-entries/:id
Get specific time entry

### PUT /time-entries/:id
Update time entry (admin/manager only)

### PATCH /time-entries/:id/approve
Approve time entry (admin/manager only)

### GET /time-entries/weekly-report
Get weekly time report
- Query params: `weekOffset` (0 for current week, -1 for last week, etc.)

---

## Schedule Management

### GET /schedule/shifts
Get shifts with filtering
- Query params: `startDate`, `endDate`, `userId`, `department`, `status`

### GET /schedule/shifts/:id
Get specific shift

### POST /schedule/shifts
Create shift (admin/manager only)
```json
{
  "userId": "user_id",
  "date": "2024-01-20",
  "startTime": "09:00",
  "endTime": "17:00",
  "position": "Sales Associate",
  "department": "Sales",
  "notes": "Regular shift"
}
```

### PUT /schedule/shifts/:id
Update shift (admin/manager only)

### DELETE /schedule/shifts/:id
Delete shift (admin/manager only)

### POST /schedule/shifts/bulk
Create multiple shifts (admin/manager only)
```json
{
  "shifts": [
    {
      "userId": "user_id",
      "date": "2024-01-20",
      "startTime": "09:00",
      "endTime": "17:00",
      "position": "Sales Associate",
      "department": "Sales"
    }
  ]
}
```

### GET /schedule/templates
Get shift templates

### POST /schedule/templates
Create shift template (admin/manager only)
```json
{
  "name": "Morning Shift",
  "department": "Sales",
  "description": "Standard morning shift",
  "shifts": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00",
      "position": "Sales Associate",
      "staffCount": 2
    }
  ]
}
```

### POST /schedule/templates/:id/apply
Apply template to generate shifts (admin/manager only)
```json
{
  "startDate": "2024-01-20",
  "endDate": "2024-01-27",
  "userAssignments": {
    "template_shift_id": ["user1", "user2"]
  }
}
```

### GET /schedule/utilization
Get staff utilization report
- Query params: `startDate`, `endDate`, `department`

---

## Dashboard & Analytics

### GET /dashboard/stats
Get general dashboard statistics

### GET /dashboard/user
Get user-specific dashboard data

### GET /analytics
Get comprehensive analytics (admin/manager only)
- Query params: `startDate`, `endDate`, `department`

### GET /analytics/payroll
Get payroll analytics (admin/manager only)
- Query params: `startDate`, `endDate`

---

## Export & Reporting

### GET /exports/time-entries
Export time entries (admin/manager only)
- Query params: 
  - `format`: `csv` or `excel` (required)
  - `startDate`, `endDate`: Date range
  - `userId`: Specific user
  - `includePayroll`: Include payroll calculations
  - `department`: Filter by department

### GET /exports/payroll
Export payroll report (admin/manager only)
- Query params: 
  - `format`: `csv` or `excel` (default: excel)
  - `startDate`, `endDate`: Date range

### GET /exports/backup
Full system backup (admin only)
- Downloads complete system backup as Excel file

---

## System Endpoints

### GET /health
Health check endpoint (no auth required)
```json
{
  "status": "OK",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

---

## Contractor Management

### POST /contractor/invite
Invite a contractor to join (Admin/Manager only)
```json
{
  "name": "John Contractor",
  "email": "john@contractor.com",
  "contractingAgency": "TechStaff Solutions",
  "department": "Development",
  "manager": "manager_id",
  "hourlyRate": 75.00,
  "startDate": "2024-02-01",
  "defaultSchedule": {
    "startTime": "09:00",
    "endTime": "17:00",
    "workDays": [1, 2, 3, 4, 5],
    "hoursPerDay": 8,
    "timezone": "America/New_York"
  }
}
```

### POST /contractor/setup/:token
Complete contractor setup (no auth required)
```json
{
  "pin": "4567",
  "timezone": "America/New_York",
  "preferences": {
    "notifications": {
      "email": true,
      "clockInReminder": false,
      "timesheetReminder": true,
      "approvalNotification": true
    }
  },
  "autoClockingSettings": {
    "enabled": true,
    "processingMode": "reactive",
    "requiresApproval": false,
    "exceptionNotificationMethod": "email"
  },
  "workSchedule": {
    "startTime": "09:00",
    "endTime": "17:00",
    "workDays": [1, 2, 3, 4, 5],
    "hoursPerDay": 8
  }
}
```

### GET /contractor/pending-approvals
Get contractors awaiting approval (Admin only)

### POST /contractor/:contractorId/approve
Approve or reject contractor registration (Admin only)
```json
{
  "approved": true,
  "overrideSettings": {
    "processingMode": "proactive"
  },
  "rejectionReason": "Optional rejection reason"
}
```

### GET /contractor/settings
Get current contractor's auto-clocking settings (Contractor only)

### PUT /contractor/settings
Update contractor auto-clocking settings (Contractor only)
```json
{
  "autoClockingSettings": {
    "enabled": true,
    "processingMode": "weekly_batch",
    "requiresApproval": true
  }
}
```

### POST /contractor/exceptions
Report an exception (sick day, vacation, etc.) - Contractor only
```json
{
  "date": "2024-01-20",
  "endDate": "2024-01-21",
  "type": "sick",
  "reason": "Flu symptoms",
  "description": "Unable to work due to illness",
  "isFullDay": true,
  "hoursAffected": 8
}
```

### GET /contractor/exceptions
Get contractor's exceptions
- Query params: `startDate`, `endDate`, `status`

### POST /contractor/:contractorId/auto-clock/trigger
Manually trigger auto-clocking for a contractor (Admin/Manager only)
```json
{
  "date": "2024-01-20"
}
```

### POST /contractor/:contractorId/auto-clock/regenerate
Regenerate auto entries for a date range (Admin/Manager only)
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

### GET /contractor/auto-clock/statistics
Get auto-clocking system statistics (Admin/Manager only)

### GET /contractor/auto-clock/health
Check auto-clocking service health (Admin only)

### GET /contractor/contractors
Get all contractors in the tenant (Admin/Manager only)
- Query params: `status`, `department`, `agency`

---

## Role-Based Access Control

### Roles
- **admin**: Full system access
- **manager**: Staff and schedule management, reports
- **staff**: Personal time tracking only
- **contractor**: Auto-time tracking, exception reporting, limited self-management

### Permission Matrix
| Endpoint | Admin | Manager | Staff | Contractor |
|----------|-------|---------|-------|-----------|
| User CRUD | ✅ | ✅ | ❌ | ❌ |
| All Time Entries | ✅ | ✅ | Own Only | Own Only |
| Schedule Management | ✅ | ✅ | View Only | View Only |
| Analytics | ✅ | ✅ | ❌ | ❌ |
| Exports | ✅ | ✅ | ❌ | ❌ |
| System Backup | ✅ | ❌ | ❌ | ❌ |
| Contractor Management | ✅ | ✅ | ❌ | ❌ |
| Auto-Clocking Controls | ✅ | ✅ | ❌ | Own Only |
| Exception Reporting | ✅ | ✅ | ❌ | Own Only |

---

## Rate Limiting
- General API: 100 requests per 15 minutes per IP
- Auth endpoints: 10 requests per 15 minutes per IP

---

## Data Models

### User
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "admin|manager|staff|contractor",
  "department": "string",
  "position": "string",
  "hourlyRate": "number",
  "overtimeRate": "number",
  "isActive": "boolean",
  "contractorInfo": {
    "contractingAgency": "string",
    "autoClocking": {
      "enabled": "boolean",
      "processingMode": "proactive|reactive|weekly_batch",
      "workSchedule": {
        "startTime": "string",
        "endTime": "string",
        "workDays": "number[]",
        "hoursPerDay": "number"
      },
      "requiresApproval": "boolean"
    },
    "registrationStatus": "invited|setup_pending|setup_completed|active|inactive"
  },
  "createdAt": "date",
  "updatedAt": "date"
}
```

### Time Entry
```json
{
  "id": "string",
  "userId": "string",
  "clockIn": "date",
  "clockOut": "date",
  "totalHours": "number",
  "regularHours": "number",
  "overtimeHours": "number",
  "status": "active|completed|cancelled",
  "isApproved": "boolean",
  "isAutoGenerated": "boolean",
  "autoGeneratedAt": "date",
  "location": "object",
  "notes": "string"
}
```

### Contractor Exception
```json
{
  "id": "string",
  "userId": "string",
  "date": "date",
  "endDate": "date",
  "type": "sick|vacation|holiday|unpaid_leave|personal|bereavement|jury_duty|custom",
  "status": "pending|approved|rejected|auto_approved",
  "reason": "string",
  "isFullDay": "boolean",
  "hoursAffected": "number",
  "createdBy": "string",
  "approvedBy": "string",
  "autoApproved": "boolean",
  "createdAt": "date"
}
```

### Shift
```json
{
  "id": "string",
  "userId": "string",
  "date": "date",
  "startTime": "string",
  "endTime": "string",
  "position": "string",
  "department": "string",
  "status": "scheduled|confirmed|completed|no-show|cancelled"
}
```

---

## Frontend Integration Notes

All API endpoints are designed to work seamlessly with the React frontend:

1. **Authentication Flow**: Frontend contexts can use the auth endpoints for login/logout
2. **Real-time Updates**: Use polling or implement WebSocket for live updates
3. **Error Handling**: Consistent error format for easy frontend error handling
4. **Export Downloads**: Export endpoints return file downloads directly
5. **Pagination**: Large datasets support pagination via query parameters

The backend fully supports all features demonstrated in the frontend including:
- ✅ PIN-based authentication
- ✅ Role-based access control
- ✅ Time tracking with break management
- ✅ Shift scheduling with templates
- ✅ Comprehensive reporting and analytics
- ✅ Export functionality (CSV/Excel)
- ✅ Dashboard statistics
- ✅ Data backup and restore