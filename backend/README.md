# StaffClock Backend API

A Node.js/Express backend API for the StaffClock employee time tracking application.

## Features

- **Authentication & Authorization**
  - JWT-based authentication
  - PIN-based quick login for staff
  - Role-based access control (admin, manager, staff)

- **Time Tracking**
  - Clock in/out functionality
  - Break time tracking
  - Automatic overtime calculation
  - Time entry approval workflow

- **Location Security**
  - Wi-Fi SSID restriction
  - IP address restriction
  - Configurable location requirements

- **Reporting & Export**
  - Weekly reports
  - CSV/Excel export functionality
  - Payroll reports
  - Department-based filtering

- **User Management**
  - Employee profiles
  - Department organization
  - Hourly rate management

## Quick Start

### Development Setup

1. **Clone and install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB** (if running locally)
   ```bash
   # Install MongoDB or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Docker Setup

1. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f api
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and PIN
- `POST /api/auth/quick-login` - Quick login with PIN only
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-pin` - Change PIN

### Time Entries
- `POST /api/time-entries/clock-in` - Clock in
- `POST /api/time-entries/clock-out` - Clock out
- `POST /api/time-entries/break/start` - Start break
- `POST /api/time-entries/break/end` - End break
- `GET /api/time-entries` - Get time entries (with filtering)
- `GET /api/time-entries/weekly-report` - Get weekly report
- `GET /api/time-entries/:id` - Get specific time entry
- `PUT /api/time-entries/:id` - Update time entry (admin/manager)
- `PATCH /api/time-entries/:id/approve` - Approve time entry

### User Management
- `GET /api/users` - Get all users (admin/manager)
- `POST /api/users` - Create user (admin)
- `GET /api/users/:id` - Get specific user
- `PUT /api/users/:id` - Update user (admin)
- `DELETE /api/users/:id` - Deactivate user (admin)
- `PATCH /api/users/:id/reset-pin` - Reset user PIN (admin)

### Export & Reporting
- `GET /api/exports/time-entries` - Export time entries
- `GET /api/exports/payroll` - Generate payroll report
- `GET /api/exports/history` - Export history
- `POST /api/exports/cleanup` - Cleanup old exports

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/staffclock` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `ALLOWED_SSIDS` | Comma-separated allowed Wi-Fi SSIDs | Optional |
| `ALLOWED_IPS` | Comma-separated allowed IP ranges | Optional |

## Security Features

### Location Restrictions
Configure Wi-Fi and IP restrictions:
```env
ALLOWED_SSIDS=StoreWiFi,OfficeNetwork
ALLOWED_IPS=192.168.1.0/24,10.0.0.0/24
```

### Rate Limiting
- API endpoints: 100 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes

### Authentication
- JWT tokens with configurable expiration
- PIN-based authentication for quick access
- Role-based authorization

## Docker Configuration

### Services
- **api**: Node.js backend application
- **mongodb**: MongoDB database
- **nginx**: Reverse proxy (production profile)

### Volumes
- `mongodb_data`: Database persistence
- `api_logs`: Application logs
- `api_uploads`: File uploads
- `api_exports`: Export files

### Health Checks
All services include health checks for monitoring.

## Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

### Testing
```bash
npm test
```

### Database Seeding
The MongoDB init script creates:
- Default admin user (email: admin@staffclock.com, PIN: 1234)
- Required indexes for performance

## Production Deployment

### DigitalOcean Setup
1. Create a Droplet with Docker
2. Configure environment variables
3. Set up SSL certificates
4. Enable nginx production profile:
   ```bash
   docker-compose --profile production up -d
   ```

### Environment Setup
```env
NODE_ENV=production
JWT_SECRET=your-secure-secret-key
MONGODB_URI=your-production-mongodb-uri
FRONTEND_URL=https://your-domain.com
ALLOWED_SSIDS=YourStoreWiFi
ALLOWED_IPS=your.public.ip.range/24
```

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Logs
```bash
# View application logs
docker-compose logs -f api

# View MongoDB logs
docker-compose logs -f mongodb
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MongoDB is running
   - Verify connection string
   - Check network connectivity

2. **Location Restrictions**
   - Verify SSID/IP configuration
   - Check client request includes location data
   - Admin users bypass restrictions

3. **Export Errors**
   - Check file permissions
   - Verify export directory exists
   - Monitor disk space

### Debug Mode
Set `LOG_LEVEL=debug` for verbose logging.

## License

Private - StaffClock Pro