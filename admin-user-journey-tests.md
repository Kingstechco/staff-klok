# Admin User Journey Tests

## Test Environment Setup
- Backend: Node.js/Express server on port 3001
- Frontend: Next.js application on port 3000  
- Database: MongoDB with seeded test data
- Test User: Admin (PIN: 0000, Email: admin@example.com)

## Test Case 1: Admin Login Flow
### Prerequisites
- Application is running and accessible
- Admin user exists in database

### Test Steps
1. Navigate to http://localhost:3000/clockin
2. Click "Admin 0000" demo PIN button
3. Verify successful login and redirect to dashboard view

### Expected Results
- Login succeeds without errors
- User is authenticated as "Admin User"
- Navigation menu shows all sections (Dashboard, Clock In/Out, Staff Management, Schedule, Reports)
- User profile shows "Admin User" with "admin" role

---

## Test Case 2: Dashboard Access and Data Display
### Prerequisites
- Admin user is logged in

### Test Steps
1. Click "Dashboard" in navigation
2. Verify dashboard loads with current date/time
3. Check stats cards display (Total Staff, Currently Working, Weekly Hours, Overtime Hours)
4. Verify quick action buttons are functional
5. Check recent activity section
6. Verify weekly overview section

### Expected Results
- Dashboard loads without errors
- Real-time clock displays current time
- Stats show appropriate data from backend
- All interactive elements respond correctly

---

## Test Case 3: Staff Management Access
### Prerequisites
- Admin user is logged in

### Test Steps
1. Navigate to Staff Management section
2. Verify staff list loads from backend
3. Test staff member creation
4. Test staff member editing
5. Test staff member deletion (if implemented)

### Expected Results
- Staff management page loads successfully
- Real user data from database is displayed
- CRUD operations work correctly
- Proper error handling for invalid operations

---

## Test Case 4: Reports and Analytics Access
### Prerequisites
- Admin user is logged in

### Test Steps
1. Navigate to Reports section
2. Verify access is granted (admin role)
3. Test report generation
4. Test data export functionality
5. Verify different report types load correctly

### Expected Results
- Reports section is accessible
- Data loads from real backend APIs
- Export functions generate actual files
- No permission errors for admin user

---

## Test Case 5: Time Tracking Management
### Prerequisites
- Admin user is logged in

### Test Steps
1. Navigate to Clock In/Out section
2. Test clock in functionality
3. Test clock out functionality
4. Verify time entry creation in backend
5. Test time entry viewing and editing

### Expected Results
- Clock in/out operations work correctly
- Time entries are stored in database
- Real-time status updates correctly
- Weekly progress calculations are accurate

---

## Test Case 6: Schedule Management
### Prerequisites
- Admin user is logged in

### Test Steps
1. Navigate to Schedule section
2. Test schedule viewing for all staff
3. Test schedule creation/editing
4. Verify schedule persistence in backend

### Expected Results
- Schedule interface loads correctly
- Can view schedules for all staff members
- Schedule changes persist to database
- Proper validation for schedule conflicts

---

## Test Case 7: Admin Logout
### Prerequisites
- Admin user is logged in

### Test Steps
1. Click "Sign Out" button
2. Verify logout completes successfully
3. Attempt to access protected routes
4. Verify session cleanup

### Expected Results
- User is logged out successfully
- Auth token is cleared from storage
- Protected routes redirect to login
- No residual session data remains

---

## Test Case 8: API Integration Verification
### Prerequisites
- Admin user is logged in
- Backend APIs are functional

### Test Steps
1. Monitor network requests during admin operations
2. Verify API calls use proper authentication headers
3. Confirm responses contain real data (not mock data)
4. Test error handling for API failures

### Expected Results
- All API calls include JWT authentication
- Responses contain real database data
- No mock data is present in responses
- Graceful error handling for API issues

---

## Success Criteria
- All admin functionality accessible and working
- Real backend API integration confirmed
- No mock data present in any responses
- Proper role-based access control enforced
- Data persistence confirmed across sessions
- Error handling works appropriately