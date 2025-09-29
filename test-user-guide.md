# 🚀 Oklok Test Users Guide

## Current Status
✅ **Backend Server**: Running on http://localhost:3001  
⚠️ **Database**: MongoDB requires authentication (secure setup)  
🔧 **Test Users**: Need to be created through proper channels  

## 🎯 Testing Approach

Since the MongoDB database has authentication enabled (which is good for security), here are your options to create test users:

### Option 1: Use MongoDB Compass (Recommended)
1. Install [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to `mongodb://localhost:27017/oklok`
3. Create collections and documents manually using the schemas below

### Option 2: Disable MongoDB Auth Temporarily
```bash
# Stop current MongoDB
# Start without authentication
mongod --dbpath /your/db/path --port 27017

# Then run the seed script:
node simple-seed.js
```

### Option 3: Use the Application Interface
If test users already exist, access the web application at http://localhost:3000

## 📋 Test User Specifications

If creating users manually, use these exact specifications:

### Test Organization/Tenant
```json
{
  "_id": ObjectId("60f7b2c5e1234567890abcdef"),
  "name": "Test Company",
  "subdomain": "test", 
  "businessType": "office",
  "isActive": true,
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD",
    "dateFormat": "MM/DD/YYYY"
  },
  "createdAt": ISODate(),
  "updatedAt": ISODate()
}
```

### Test Users
**Collection**: `users`

#### Admin User
```json
{
  "tenantId": ObjectId("60f7b2c5e1234567890abcdef"),
  "name": "Admin User",
  "email": "admin@test.com",
  "pin": "$2b$12$[bcrypt-hash-of-1234]",
  "role": "admin",
  "permissions": ["user_management", "tenant_settings", "analytics_access"],
  "employmentType": "full_time",
  "employmentStatus": "active",
  "isActive": true,
  "loginAttempts": 0,
  "preferences": {
    "timezone": "America/New_York",
    "language": "en",
    "notifications": {
      "email": true,
      "push": true,
      "clockInReminder": false,
      "timesheetReminder": true,
      "approvalNotification": true
    },
    "dashboard": {
      "showWeekends": false,
      "timeFormat": "12h"
    }
  },
  "createdAt": ISODate(),
  "updatedAt": ISODate()
}
```

#### Manager User  
```json
{
  "tenantId": ObjectId("60f7b2c5e1234567890abcdef"),
  "name": "Manager User",
  "email": "manager@test.com", 
  "pin": "$2b$12$[bcrypt-hash-of-2345]",
  "role": "manager",
  "permissions": ["team_management", "schedule_management", "team_reports"],
  "employmentType": "full_time",
  "employmentStatus": "active",
  "isActive": true,
  "loginAttempts": 0,
  "preferences": {
    "timezone": "America/New_York",
    "language": "en",
    "notifications": {
      "email": true,
      "push": true,
      "clockInReminder": false,
      "timesheetReminder": true,
      "approvalNotification": true
    },
    "dashboard": {
      "showWeekends": false,
      "timeFormat": "12h"
    }
  },
  "createdAt": ISODate(),
  "updatedAt": ISODate()
}
```

#### Staff User
```json
{
  "tenantId": ObjectId("60f7b2c5e1234567890abcdef"),
  "name": "Staff User", 
  "email": "staff@test.com",
  "pin": "$2b$12$[bcrypt-hash-of-3456]",
  "role": "staff",
  "permissions": ["time_tracking", "view_own_data", "edit_own_profile"],
  "employmentType": "full_time",
  "employmentStatus": "active", 
  "isActive": true,
  "loginAttempts": 0,
  "preferences": {
    "timezone": "America/New_York",
    "language": "en",
    "notifications": {
      "email": true,
      "push": true,
      "clockInReminder": true,
      "timesheetReminder": true,
      "approvalNotification": false
    },
    "dashboard": {
      "showWeekends": false,
      "timeFormat": "12h"
    }
  },
  "createdAt": ISODate(),
  "updatedAt": ISODate()
}
```

## 🔑 Test Credentials

Once users are created, test with these PINs:
- **1234** → Admin User (Full dashboard access)
- **2345** → Manager User (Team management features)  
- **3456** → Staff User (Personal dashboard only)

## 🧪 API Testing

Test the authentication endpoints:

```bash
# Test quick login (PIN only)
curl -X POST http://localhost:3001/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234"}'

# Test full login (email + PIN) 
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","pin":"1234"}'

# Check server health
curl http://localhost:3001/health
```

## 🎮 Frontend Testing

1. Navigate to http://localhost:3000
2. Go to the clock-in page
3. Enter a PIN (1234, 2345, or 3456)
4. Test role-based dashboard features

## ✨ Features to Test

- ✅ PIN-based authentication
- ✅ Role-based dashboard views (admin vs staff)
- ✅ Modern UI with Oklok branding
- ✅ Clock-in/Clock-out functionality
- ✅ Multi-tenant organization support
- ✅ Responsive design
- ✅ Time tracking features
- ✅ User management (admin only)
- ✅ Team management (manager/admin)

## 🔧 Troubleshooting

**"Clock-in failed" error**: User doesn't exist with that PIN
**Connection refused**: Backend server not running
**Empty dashboard**: Check user role and permissions
**Authentication error**: Check PIN format and user active status

---
*Generated for Oklok testing environment*