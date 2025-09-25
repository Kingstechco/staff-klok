# StaffClock Pro - Admin Web Dashboard

A comprehensive Next.js admin dashboard for managing staff, schedules, time tracking, and reporting in the StaffClock Pro system.

## 🚀 Features

### Authentication & User Management
- **Role-based authentication** (Admin, Manager, Staff, Contractor)
- **PIN-based quick login** for staff members
- **Comprehensive user CRUD** operations
- **Contractor invitation and setup workflow**
- **Department organization** and management
- **Secure session management** with JWT tokens

### Time Tracking Management
- **Clock-in approval workflow** for managers
- **Real-time attendance monitoring**
- **Break time tracking** oversight
- **Overtime calculation** and review
- **Time entry corrections** and adjustments

### Contractor Management
- **Auto-clocking system** with three processing modes
- **Contractor invitation workflow** via email setup links
- **Exception management** for contractor time off
- **Approval workflows** for contractor registration and timesheets
- **Auto-clocking statistics** and system health monitoring

### Scheduling System
- **Visual shift scheduling** with drag-and-drop interface
- **Shift templates** for recurring schedules
- **Staff availability** management
- **Department-based scheduling**
- **Conflict detection** and resolution

### Reporting & Analytics
- **Weekly attendance reports**
- **Payroll calculations** with overtime
- **Department utilization** analytics
- **Export functionality** (CSV/Excel)
- **Custom date range** reporting

### Administrative Features
- **Multi-tenant ready** architecture
- **System settings** configuration
- **Audit logging** review
- **User activity** monitoring
- **Data backup** and export

## 🏗️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **HTTP Client**: Native Fetch API
- **Testing**: Playwright for E2E testing
- **Authentication**: JWT with secure storage

## 🚦 Quick Start

### Prerequisites
- Node.js 18 or higher
- Backend API running (see [backend README](../backend/README.md))

### Development Setup

1. **Install dependencies**
   ```bash
   cd admin-web
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Environment Configuration

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME="StaffClock Pro"
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
```

## 🔐 Default Login Credentials

For development and testing:
- **Admin**: admin@staffclock.com / PIN: 1234
- **Manager**: manager@staffclock.com / PIN: 2345  
- **Staff**: john.doe@staffclock.com / PIN: 3456

## 📱 Application Structure

### Pages & Routes
```
/                 # Dashboard overview
/login            # Authentication page
/staff            # Staff management
/schedule         # Shift scheduling
/clockin          # Clock-in monitoring
/approvals        # Time entry approvals
/reports          # Analytics and reporting
/settings         # System configuration
/contractors      # Contractor management dashboard
/contractor/setup # Contractor setup wizard (no auth)
/signup           # Tenant registration (multi-tenant)
```

### Components Architecture
```
src/
├── app/                    # Next.js App Router pages
├── components/             # Reusable UI components
│   ├── Navigation.tsx      # Main navigation
│   └── RouteGuard.tsx      # Authentication protection
├── contexts/               # React Context providers
│   ├── AuthContext.tsx     # Authentication state
│   ├── ScheduleContext.tsx # Schedule management
│   └── TimeTrackingContext.tsx # Time tracking state
└── utils/                  # Utility functions
    ├── api.ts              # API client
    ├── exportUtils.ts      # Export functionality
    └── routing.ts          # Navigation utilities
```

## 🧪 Testing

### End-to-End Testing with Playwright

1. **Install Playwright**
   ```bash
   npx playwright install
   ```

2. **Run tests**
   ```bash
   npm run test:e2e
   ```

### Test Coverage
- **Authentication flows** (login, logout, role switching)
- **User management** (CRUD operations)
- **Time tracking** (clock-in/out, approvals)
- **Scheduling** (shift creation, templates)
- **Contractor management** (invitation, setup, approvals)
- **Auto-clocking workflows** (mode selection, exception handling)
- **Reporting** (data export, filtering)

### Test Files
```
tests/
├── tenant-signup.spec.ts           # Multi-tenant registration
├── tenant-settings.spec.ts         # Tenant configuration
├── contractor-management.spec.ts   # Contractor features
├── timesheet-approvals.spec.ts     # Approval workflows
└── multi-tenant-integration.spec.ts # Cross-tenant isolation
```

## 🏢 Contractor Management Features

### Contractor Dashboard (`/contractors`)

The contractor management dashboard provides comprehensive oversight of contractor auto-clocking system:

#### **Main Features:**
1. **Statistics Overview**
   - Total contractors enrolled
   - Active contractors count
   - Pending approvals count
   - Auto-clocking enabled count

2. **Contractor List Management**
   - View all active contractors
   - Monitor auto-clocking status
   - Toggle auto-clocking on/off
   - View processing mode for each contractor

3. **Pending Approvals**
   - Review contractor setup submissions
   - Approve/reject contractor registrations
   - View contractor preferences and schedules
   - Override auto-clocking settings during approval

#### **Contractor Invitation Workflow:**

1. **Send Invitation**
   ```typescript
   // Admin fills invitation form
   const inviteData = {
     name: "John Contractor",
     email: "john@example.com", 
     contractingAgency: "TechStaff Solutions",
     department: "Development",
     hourlyRate: 75.00,
     defaultSchedule: {
       startTime: "09:00",
       endTime: "17:00",
       hoursPerDay: 8,
       workDays: [1,2,3,4,5] // Mon-Fri
     }
   };
   ```

2. **Email Setup Link**
   - System generates secure setup token
   - Email sent with setup link
   - Link expires in 7 days

3. **Contractor Setup Process**
   - 4-step setup wizard at `/contractor/setup`
   - PIN creation and preferences
   - Work schedule confirmation
   - Auto-clocking mode selection

4. **Admin Approval**
   - Review completed setup
   - Approve/reject with optional overrides
   - Activate contractor for auto-clocking

### Auto-Clocking Management

#### **Processing Modes Available:**

1. **Proactive Mode** 
   - Cron: `0 0 * * *` (midnight daily)
   - Creates entries at start of workday
   - Requires early exception reporting

2. **Reactive Mode**
   - Cron: `0 18 * * *` (6 PM daily)
   - Fills missing entries at end of day
   - Allows mixed manual/auto entries

3. **Weekly Batch Mode**
   - Cron: `0 23 * * 5` (Friday 11 PM)
   - Generates full week timesheets
   - Bulk processing approach

#### **Admin Controls:**
- **Manual Trigger**: Force auto-clocking for specific contractor/date
- **Regenerate Entries**: Recreate entries for date range
- **System Statistics**: View auto-clocking performance metrics
- **Health Monitoring**: Check cron job status and service health

### Exception Management

#### **Exception Types Supported:**
```typescript
type ExceptionType = 
  | 'sick' 
  | 'vacation' 
  | 'holiday' 
  | 'unpaid_leave'
  | 'personal' 
  | 'bereavement' 
  | 'jury_duty' 
  | 'custom';
```

#### **Auto-Approval Rules:**
- Sick days (≤3 consecutive days): Auto-approved
- Single personal days: Auto-approved
- Company holidays: Auto-approved
- Vacation/extended leave: Requires manager approval

### Technical Implementation

#### **Key Components:**
```typescript
// Contractor dashboard components
components/contractors/
├── ContractorsList.tsx          # Active contractors table
├── PendingApprovals.tsx         # Approval queue
├── InviteContractorModal.tsx    # Invitation form
├── ContractorStatistics.tsx     # Overview cards
└── AutoClockingControls.tsx     # System controls

// Contractor setup wizard  
app/contractor/setup/
├── page.tsx                     # Main setup page
├── SetupWizard.tsx              # 4-step wizard component
├── AutoClockingOptions.tsx      # Mode selection
└── SetupReview.tsx              # Final confirmation
```

#### **State Management:**
```typescript
// Contractor context for state management
interface ContractorContextType {
  contractors: Contractor[];
  pendingApprovals: PendingContractor[];
  statistics: ContractorStats;
  inviteContractor: (data: InviteData) => Promise<void>;
  approveContractor: (id: string, approved: boolean) => Promise<void>;
  toggleAutoClocking: (id: string, enabled: boolean) => Promise<void>;
}
```

### API Integration

All contractor management features integrate with backend endpoints:

```typescript
// API calls for contractor management
const contractorAPI = {
  // Invitation and setup
  invite: '/api/contractor/invite',
  setup: '/api/contractor/setup/:token',
  
  // Management
  getContractors: '/api/contractor/contractors',
  getPendingApprovals: '/api/contractor/pending-approvals',
  approve: '/api/contractor/:id/approve',
  
  // Auto-clocking controls
  triggerAutoClocking: '/api/contractor/:id/auto-clock/trigger',
  regenerateEntries: '/api/contractor/:id/auto-clock/regenerate',
  getStatistics: '/api/contractor/auto-clock/statistics',
  getHealthStatus: '/api/contractor/auto-clock/health'
};
```

### User Experience Features

1. **Responsive Design**: Full mobile/tablet support
2. **Real-time Updates**: Statistics refresh automatically
3. **Bulk Operations**: Approve multiple contractors at once
4. **Search & Filter**: Find contractors by name, agency, status
5. **Export Capabilities**: Download contractor reports
6. **Audit Trail**: Track all contractor management actions

## 🎨 Design System

### Styling Approach
- **Tailwind CSS** for utility-first styling
- **Responsive design** for mobile/tablet/desktop
- **Dark mode ready** (configurable)
- **Accessible** components with ARIA support

### Color Scheme
- **Primary**: Blue (#3B82F6)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Neutral**: Gray scale for text and backgrounds

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Testing
npm run test:e2e     # Run Playwright tests
npm run test:ui      # Open Playwright UI
```

### State Management Pattern

The application uses React Context for state management:

1. **AuthContext** - User authentication and permissions
2. **ScheduleContext** - Schedule management and shift data
3. **TimeTrackingContext** - Real-time attendance data

### API Integration

All API calls are centralized in `src/utils/api.ts`:
```typescript
// Example usage
import { api } from '@/utils/api';

const users = await api.get('/users');
await api.post('/time-entries/clock-in', data);
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Docker Deployment
```bash
# Build image
docker build -t staffclock-admin .

# Run container
docker run -p 3000:3000 staffclock-admin
```

### Environment Variables (Production)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_NAME="StaffClock Pro"
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
NODE_ENV=production
```

## 🔍 Monitoring & Analytics

### Performance Monitoring
- Built-in Next.js analytics
- Core Web Vitals tracking
- Error boundary implementation
- Loading state management

### User Activity Tracking
- Page view analytics
- Feature usage metrics
- Error logging and reporting
- Performance monitoring

## 🤝 Development Guidelines

### Code Style
- **TypeScript** strict mode enabled
- **ESLint** with Next.js configuration
- **Prettier** for code formatting
- **Conventional commits** for git messages

### Component Patterns
```typescript
// Example component structure
interface ComponentProps {
  // Props definition
}

export default function Component({ prop }: ComponentProps) {
  // Component implementation
}
```

### Error Handling
- Comprehensive error boundaries
- User-friendly error messages
- Graceful degradation for network issues
- Loading states for all async operations

## 📚 Documentation

- [Backend API Documentation](../backend/API.md)
- [Contractor User Manual](../CONTRACTOR_USER_MANUAL.md)
- [Database Schema](../backend/README.md#data-models)
- [Deployment Guide](../README.md#deployment)
- [Testing Strategy](./tests/README.md)

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Verify backend is running
   - Check NEXT_PUBLIC_API_URL in .env.local
   - Ensure CORS is configured in backend

2. **Authentication Issues**
   - Clear browser storage
   - Verify JWT_SECRET matches backend
   - Check token expiration settings

3. **Build Errors**
   - Update Node.js to version 18+
   - Clear node_modules and reinstall
   - Check TypeScript errors with `npm run type-check`

### Debug Mode
Set `NODE_ENV=development` for verbose logging and error details.

## 🔐 Security Considerations

- **XSS Protection** via React's built-in sanitization
- **CSRF Protection** with proper token handling
- **Secure Storage** of authentication tokens
- **Input Validation** on all form submissions
- **Role-based Access Control** throughout the application

---

**StaffClock Pro Admin Dashboard** - Comprehensive staff management made simple.
