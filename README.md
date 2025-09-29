# Oklok - Complete Time Tracking System

A comprehensive staff time tracking and management system with location-based clock-in, role-based access control, and advanced reporting capabilities.

## 🚀 Features

### Core Time Tracking
- **Location-restricted clock-in/out** with Wi-Fi SSID and IP validation
- **PIN-based authentication** for quick access
- **Break time tracking** with automatic calculations
- **Overtime calculation** with configurable rates
- **Real-time attendance monitoring**

### Staff Management
- **Multi-role system**: Admin, Manager, Staff, Contractor
- **Department organization** with hierarchical permissions
- **Employee profiles** with hourly rates and positions
- **Contractor management** with auto-clocking capabilities
- **Shift scheduling** with template support
- **User-friendly self-service portal**

### Advanced Features
- **Multi-tenant architecture** (expandable to support multiple businesses)
- **Contractor auto-clocking** with flexible processing modes
- **Exception management** for contractor time off
- **Hybrid registration system** for contractor onboarding
- **Comprehensive reporting** and analytics
- **CSV/Excel export** functionality
- **Audit logging** for all system activities
- **Responsive web interface** for admin management

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15 with React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js with Express, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with PIN-based quick access
- **Testing**: Playwright (E2E), Jest (Backend)
- **Deployment**: Docker containers with Docker Compose

### Project Structure
```
staff-klok/
├── admin-web/          # Next.js admin dashboard
├── backend/            # Node.js API server
├── staff-demo/         # Staff self-service demo
└── docs/              # Documentation and user guides
```

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- MongoDB (or use Docker)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd staff-klok
   ```

2. **Start the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Start the admin web interface**
   ```bash
   cd admin-web
   npm install
   npm run dev
   ```

4. **Access the applications**
   - Backend API: http://localhost:5000
   - Admin Dashboard: http://localhost:3000
   - API Documentation: http://localhost:5000/api/health

### Docker Setup (Recommended)

1. **Start all services**
   ```bash
   cd backend
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f
   ```

## 📊 Default Users

The system comes with pre-configured demo users:

- **Admin**: admin@oklok.com / PIN: 1234
- **Manager**: manager@oklok.com / PIN: 2345
- **Staff**: john.doe@oklok.com / PIN: 3456
- **Contractors**: Use invitation system for registration

## 🔐 Security Features

### Location Restrictions
Configure allowed Wi-Fi networks and IP ranges:
```env
ALLOWED_SSIDS=StoreWiFi,OfficeNetwork
ALLOWED_IPS=192.168.1.0/24,10.0.0.0/24
```

### Authentication
- JWT tokens with configurable expiration
- PIN-based quick authentication for staff
- Role-based access control (RBAC)
- Rate limiting on all endpoints

### Data Protection
- Audit logging for all user actions
- Secure password hashing
- Input validation and sanitization
- CORS protection

## 📈 Key Capabilities

### For Administrators
- Complete user management and role assignment
- System-wide analytics and reporting
- Export functionality for payroll processing
- Multi-tenant support (future expansion)
- Audit trail monitoring

### For Managers
- Department staff oversight
- Shift scheduling and templates
- Time entry approval workflow
- Department-specific reporting
- Staff utilization analytics

### For Staff
- Quick PIN-based clock-in/out
- Personal timesheet viewing
- Break time tracking
- Weekly hours summary
- Self-service profile management

### For Contractors
- **Auto-clocking system** with three processing modes:
  - **Proactive**: Auto clock-in at start of day (9 AM)
  - **Reactive**: Auto-fill missing entries at end of day (6 PM) 
  - **Weekly Batch**: Generate full week timesheet on Fridays
- **Exception reporting** for sick days, vacation, holidays
- **Self-service setup wizard** with schedule configuration
- **Flexible approval workflows** (optional manager approval)
- **Hybrid registration** (admin-initiated, user-completed)

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/oklok
JWT_SECRET=your-secure-secret-key
FRONTEND_URL=http://localhost:3000
ALLOWED_SSIDS=YourWiFiNetwork
ALLOWED_IPS=192.168.1.0/24
```

**Admin Web (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Oklok
```

## 📋 Testing

### Backend Tests
```bash
cd backend
npm test
```

### End-to-End Tests
```bash
cd admin-web
npx playwright test
```

### Test Coverage
- API endpoint testing with Jest
- Database integration tests
- Authentication flow testing
- E2E user journey testing with Playwright

## 🚀 Deployment

### Production Deployment

1. **Configure production environment**
   ```bash
   # Update .env files with production values
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-secret
   ```

2. **Deploy with Docker**
   ```bash
   docker-compose --profile production up -d
   ```

3. **SSL Setup** (with nginx profile)
   ```bash
   # SSL certificates automatically managed by Certbot
   ```

### Scaling Considerations
- MongoDB replica sets for high availability
- Redis for session management (future implementation)
- Load balancing with nginx
- CDN for static assets

## 🏢 Contractor Management System

### Overview
The contractor auto-clocking system automates time entry generation for contractors who work predictable schedules but may not always manually clock in/out. This addresses the common scenario where contracting agencies require 8-hour workday documentation but contractors may report sick or take time off.

### Key Features

#### **Auto-Clocking Processing Modes**
1. **Proactive Mode**: Automatically generates time entries at the start of each workday (9 AM)
   - Best for: Contractors with very predictable schedules
   - Requires: Exception reporting before start of day
   
2. **Reactive Mode**: Checks at end of day (6 PM) and fills missing time entries
   - Best for: Contractors who sometimes manual clock but want backup automation
   - Allows: Flexible day management with safety net
   
3. **Weekly Batch Mode**: Generates complete week timesheets on Fridays
   - Best for: Set-and-forget contractors who prefer weekly overview
   - Provides: Bulk timesheet management

#### **Exception Management**
- **Sick days, vacation, holidays**: Full-day or partial-day exceptions
- **Auto-approval rules**: Configurable automatic approval for certain exception types
- **Retroactive reporting**: Handle exceptions reported after auto-entries exist
- **Notification system**: Email alerts for exception status changes

#### **Registration Workflow**
1. **Admin Invitation**: Admin invites contractor via email with setup link
2. **Contractor Setup**: 4-step wizard for PIN, schedule, and auto-clocking preferences
3. **Admin Approval**: Final approval before contractor activation
4. **Auto-Clocking Activation**: System begins automated time entry generation

### Technical Architecture
- **Cron Job Scheduling**: Automated processing at configured times
- **Exception Checking**: Smart validation against reported time off
- **Conflict Resolution**: Prevents duplicate entries and overlapping time
- **Audit Logging**: Complete history of auto-generation decisions
- **Multi-tenant Support**: Isolated contractor management per organization

## 📚 Documentation

- [Backend API Documentation](backend/API.md)
- [Admin Web Interface Guide](admin-web/README.md)
- [Migration Guide](backend/MIGRATION_GUIDE.md)
- [Multi-tenant Expansion Plan](backend/MULTI_TENANT_EXPANSION_PLAN.md)
- [RBAC Strategy](backend/RBAC_STRATEGY.md)

## 🧪 Development Status

### Completed Features ✅
- Core time tracking functionality
- Authentication and authorization
- Admin dashboard with full CRUD operations
- **Contractor auto-clocking system** with three processing modes
- **Contractor invitation and setup workflow**
- **Exception management system** for contractor time off
- **Auto-clocking service** with cron job scheduling
- Reporting and export capabilities
- Location-based restrictions
- Docker containerization
- Comprehensive test suites

### In Progress 🔄
- Mobile application (React Native)
- Advanced analytics dashboard
- Real-time notifications
- Multi-tenant architecture

### Planned Features 📝
- Geolocation verification
- Photo capture for attendance
- Integration with payroll systems
- Advanced scheduling algorithms
- Mobile push notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Check the documentation in each component's README
- Review the API documentation for backend integration
- Examine the test files for usage examples
- Contact the development team for technical assistance

---

**Oklok** - Professional time tracking made simple.