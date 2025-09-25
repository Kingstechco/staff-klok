# Clock-In App — Project Spec (DigitalOcean Hosting)

## 📌 Overview
Mobile + web app for a store owner (Tammy) to manage staff hours. Staff clock in/out only on approved Wi-Fi. System calculates weekly hours vs 45-hour target. Admin can view/export.

---

## 🎯 Core Requirements
- Clock in/out restricted to **authorized Wi-Fi (SSID/IP)**.
- Record **userId, timestamp, IP, SSID** per event.
- Weekly total with **45-hour** progress.
- Staff self-view of weekly hours.
- Admin (Tammy): staff list, weekly hours, **CSV/Excel export**.
- Runs on **iOS & Android**.

---

## 🛠️ Tech Stack
- **Mobile (staff):** Flutter
- **Backend/API:** Node.js + Express
- **DB:** PostgreSQL
- **Admin (web):** Next.js (React)
- **Exports:** CSV (and optional Excel)
- **Auth:** JWT (roles: `staff`, `admin`)
- **Tests:** Jest (API), Flutter test, Playwright (admin)

---

## ☁️ DigitalOcean Architecture
- **Managed Database: PostgreSQL** (DO Managed Databases)
- **Backend/API:** 1–2 **Droplets** (Ubuntu LTS) running Docker Compose  
  - Nginx reverse proxy + Let's Encrypt (Certbot)
  - Private networking to DB via **DO VPC**
- **Admin (Next.js):**
  - Option A: **DO App Platform** (static export)  
  - Option B: Nginx on the same Droplet (if needed)
- **File Exports:** **DO Spaces** (S3-compatible) for storing/download of CSVs (optional; can stream direct)
- **Security:** DO **Cloud Firewalls**, VPC only DB access, HTTPS everywhere
- **Scaling/LB (optional):** DO **Load Balancer** in front of API Droplets

---

# Staff Clocking App - Project Plan

## Overview
A staff time tracking application that allows employees to clock in/out and managers to monitor attendance.

## Core Features
- Employee clock in/out functionality
- Time tracking and attendance logging
- Manager dashboard for monitoring staff
- Shift management
- Report generation

## Technical Requirements
- User authentication (employees and managers)
- Database for storing time records
- Real-time clock interface
- Admin panel for management
- Reporting and analytics

## Technology Stack Considerations
- Frontend: React/Vue.js or native mobile app
- Backend: Node.js/Express or Python/Django
- Database: PostgreSQL or MongoDB
- Authentication: JWT tokens
- Deployment: Docker containers

## Key Components to Implement
1. Authentication system
2. Clock in/out interface
3. Time tracking database schema
4. Manager dashboard
5. Reporting system
6. User management

## Next Steps
1. Define detailed requirements
2. Choose technology stack
3. Set up development environment
4. Create database schema
5. Implement core features
6. Add reporting and analytics
7. Testing and deployment

## Notes
- Consider mobile-first design for ease of use
- Implement geolocation for clock-in verification
- Add photo capture for attendance verification
- Include break time tracking
- Support for multiple shifts and departments