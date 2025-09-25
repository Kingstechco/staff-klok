# Staff User Journey Tests

## Test Environment Setup
- Backend: Node.js/Express server on port 3001
- Frontend: Next.js application on port 3000
- Database: MongoDB with seeded test data
- Test Users: John Smith (PIN: 1234), Sarah Johnson (PIN: 2345), etc.

## Test Case 1: Staff Login Flow
### Prerequisites
- Application is running and accessible
- Staff users exist in database with correct PINs

### Test Steps
1. Navigate to http://localhost:3000/clockin
2. Enter staff PIN (e.g., 1234 for John Smith)
3. Click "Sign In" or use demo button
4. Verify successful login

### Expected Results
- Login succeeds with valid staff PIN
- User is authenticated with staff role
- Limited navigation menu (no admin-only sections)
- User profile shows staff member name and role

---

## Test Case 2: Staff Clock In Process
### Prerequisites
- Staff user is logged in
- User is not currently clocked in

### Test Steps
1. Verify current status shows "Off Duty"
2. Click "Clock In" button
3. Verify network status shows store WiFi connection
4. Confirm clock in operation completes

### Expected Results
- Status changes to "Working"
- Clock in time is recorded in backend
- Button changes to "Clock Out"
- Weekly progress updates appropriately

---

## Test Case 3: Staff Clock Out Process
### Prerequisites
- Staff user is logged in and clocked in

### Test Steps
1. Verify current status shows "Working"
2. Click "Clock Out" button
3. Confirm clock out operation completes
4. Verify time entry is created with duration

### Expected Results
- Status changes to "Off Duty"
- Clock out time recorded correctly
- Button changes to "Clock In"
- Total hours calculated and added to weekly progress

---

## Test Case 4: Weekly Progress Tracking
### Prerequisites
- Staff user is logged in
- Some time entries exist for the current week

### Test Steps
1. View weekly progress section
2. Verify hours calculation is accurate
3. Check progress bar reflects correct percentage
4. Confirm remaining hours calculation

### Expected Results
- Weekly hours reflect actual database entries
- Progress bar shows correct percentage of 45-hour target
- Remaining hours calculation is accurate
- Data updates after clock in/out operations

---

## Test Case 5: Access Control Verification
### Prerequisites
- Staff user is logged in

### Test Steps
1. Attempt to navigate to /staff (Staff Management)
2. Attempt to navigate to /reports (Reports)
3. Attempt to navigate to /schedule (Schedule Management)
4. Verify restricted access

### Expected Results
- Staff management page shows "Access Denied"
- Reports page shows "Access Denied"
- Schedule page may show read-only view or access denied
- Navigation menu does not show admin-only sections

---

## Test Case 6: Staff Dashboard Access
### Prerequisites
- Staff user is logged in

### Test Steps
1. Navigate to Dashboard
2. Verify limited dashboard view appropriate for staff
3. Check available quick actions
4. Verify data relevance to staff role

### Expected Results
- Dashboard shows staff-appropriate information
- Limited quick actions (no admin functions)
- Personal time tracking data visible
- No sensitive business analytics

---

## Test Case 7: Multiple Staff Sessions
### Prerequisites
- Multiple staff users available

### Test Steps
1. Login as first staff member in browser window
2. Login as second staff member in incognito/different browser
3. Test concurrent clock in/out operations
4. Verify session isolation

### Expected Results
- Both users can login simultaneously
- Clock operations don't interfere between users
- Session data is properly isolated
- Database updates reflect correct user for each operation

---

## Test Case 8: Staff Logout and Session Management
### Prerequisites
- Staff user is logged in

### Test Steps
1. Click "Sign Out" button
2. Verify logout completes successfully
3. Attempt to access clock in/out without login
4. Verify session cleanup

### Expected Results
- User is logged out successfully
- Redirected to login screen
- Cannot access time tracking without authentication
- Auth token cleared from browser storage

---

## Test Case 9: PIN Validation and Error Handling
### Prerequisites
- Application is accessible

### Test Steps
1. Enter invalid PIN (e.g., 9999)
2. Verify error message displays
3. Enter correct PIN after error
4. Test PIN field validation (length, characters)

### Expected Results
- Invalid PIN shows appropriate error message
- Error clears when entering valid PIN
- PIN field enforces proper format
- Multiple failed attempts handled gracefully

---

## Test Case 10: Time Tracking Data Persistence
### Prerequisites
- Staff user account with some historical data

### Test Steps
1. Login as staff user
2. Perform clock in/out operations
3. Logout and login again
4. Verify time tracking data persists

### Expected Results
- Time entries persist across sessions
- Weekly totals remain accurate
- Historical data is maintained
- Current status reflects actual database state

---

## Success Criteria
- Staff can login with correct PINs
- Time tracking operations work correctly
- Access control properly restricts admin features
- Data persists correctly in database
- Session management works properly
- Error handling is appropriate for staff users
- Multiple staff can use system simultaneously