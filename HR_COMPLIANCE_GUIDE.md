# HR Compliance & Employment Type Management Guide

## Overview

StaffClock Pro includes comprehensive HR compliance features that ensure your organization meets labor law requirements while providing flexible workforce management. The system supports multiple employment types with distinct work hour regulations, leave entitlements, and scheduling rules.

## Table of Contents

1. [Employment Types](#employment-types)
2. [Work Hour Regulations](#work-hour-regulations)
3. [Compliance Features](#compliance-features)
4. [Shift Scheduling with HR Rules](#shift-scheduling-with-hr-rules)
5. [Leave Management](#leave-management)
6. [Payroll Calculations](#payroll-calculations)
7. [Reporting & Analytics](#reporting--analytics)
8. [Setup and Configuration](#setup-and-configuration)

---

## Employment Types

### Supported Classifications

The system supports four main employment classifications:

#### **1. Full-Time Permanent Employees**
- **Standard Hours:** 40 hours/week, 8 hours/day
- **Overtime:** After 8 hours/day or 40 hours/week (1.5x rate)
- **Benefits:** Full benefits package, paid leave, health insurance
- **Leave Entitlement:** 15 annual, 10 sick, 3 personal days
- **Schedule Flexibility:** Limited flexibility, standard business hours

#### **2. Part-Time Employees**
- **Standard Hours:** 20 hours/week, 6 hours/day maximum
- **Overtime:** After 6 hours/day or 30 hours/week (1.5x rate)
- **Benefits:** Limited benefits, prorated leave
- **Leave Entitlement:** 7 annual, 5 sick, 2 personal days
- **Schedule Flexibility:** High flexibility, varied hours allowed

#### **3. Full-Time Contractors**
- **Standard Hours:** 40 hours/week, up to 10 hours/day
- **Overtime:** After 8 hours/day or 40 hours/week (straight time)
- **Benefits:** No traditional benefits, invoice-based pay
- **Leave Entitlement:** Unpaid time off only
- **Auto-Clocking:** Eligible for automated time tracking
- **Schedule Flexibility:** High flexibility, project-based work

#### **4. Casual Workers**
- **Standard Hours:** 15 hours/week, 8 hours/day maximum
- **Overtime:** After 8 hours/day or 35 hours/week (1.25x rate)
- **Benefits:** Minimal benefits, hourly pay
- **Leave Entitlement:** Limited sick leave only
- **Schedule Flexibility:** Maximum flexibility, on-demand work

### Custom Employment Types

Administrators can create custom employment types with specific:

- **Work hour limits** (daily/weekly)
- **Overtime thresholds and rates**
- **Break requirements**
- **Scheduling constraints**
- **Leave entitlements**
- **Compliance requirements**

---

## Work Hour Regulations

### Daily Hour Limits

Each employment type has configurable daily hour limits:

```javascript
// Example configuration
workHourRules: {
  maxHoursPerDay: 8,        // Maximum hours per day
  overtimeThreshold: {
    daily: 8                // Overtime after 8 hours
  }
}
```

### Weekly Hour Limits

Weekly limits prevent overwork and ensure compliance:

```javascript
workHourRules: {
  standardHoursPerWeek: 40,  // Standard weekly hours
  maxHoursPerWeek: 50,       // Maximum allowed weekly hours
  overtimeThreshold: {
    weekly: 40               // Overtime after 40 hours/week
  }
}
```

### Break Requirements

Mandatory break rules based on shift length:

```javascript
breakRules: {
  minBreakDuration: 15,      // Minimum break (minutes)
  maxWorkWithoutBreak: 6,    // Max hours before break required
  lunchBreakRequired: true,  // Lunch break for 6+ hour shifts
  lunchBreakDuration: 60,    // Lunch break duration (minutes)
  restBetweenShifts: 11      // Hours required between shifts
}
```

### Rest Period Enforcement

- **Between Shifts:** Minimum 11-hour rest period
- **Consecutive Days:** Maximum 6 consecutive working days
- **Weekly Rest:** Minimum 1 full day off per week

---

## Compliance Features

### Background Checks & Drug Testing

Track completion of mandatory compliance requirements:

```javascript
compliance: {
  backgroundCheckRequired: true,
  backgroundCheckDate: Date,
  drugTestingRequired: true,
  drugTestDate: Date
}
```

### Certifications Management

Monitor professional certifications and expiration dates:

```javascript
certifications: [{
  name: "Food Safety Certification",
  issuedDate: "2024-01-15",
  expirationDate: "2025-01-15",
  certifyingBody: "ServSafe"
}]
```

### Work Eligibility Verification

Track I-9 and other work authorization documentation:

```javascript
workEligibility: {
  verified: true,
  documentType: "US Passport",
  expirationDate: "2030-05-15"
}
```

### Mandatory Training Tracking

Monitor completion of required training programs:

```javascript
mandatoryTrainingCompleted: [
  "Sexual Harassment Prevention",
  "Workplace Safety",
  "Data Privacy"
]
```

---

## Shift Scheduling with HR Rules

### Real-Time Validation

The system validates all shift scheduling against employment type rules:

#### **Time Restrictions**
- Earliest start time enforcement
- Latest end time enforcement
- Night shift permissions
- Weekend work permissions

#### **Consecutive Work Limits**
- Maximum consecutive working days
- Automatic rest day requirements
- Advanced notice requirements for schedule changes

#### **Hour Limits**
- Daily hour maximums
- Weekly hour projections
- Overtime warnings and approvals

### Validation Examples

```javascript
// Validation response for shift scheduling
{
  canSchedule: false,
  conflicts: [{
    type: 'WEEKLY_LIMIT',
    message: 'Would exceed weekly hour limit (48h > 40h allowed)'
  }],
  recommendations: [
    'Consider splitting shift across multiple days',
    'Schedule additional rest day this week'
  ]
}
```

### Conflict Resolution

When scheduling conflicts arise:

1. **Automatic Suggestions:** System provides alternative times/dates
2. **Override Options:** Admin can override with justification
3. **Compliance Warnings:** Visual indicators for policy violations
4. **Approval Workflows:** Manager approval for exception requests

---

## Leave Management

### Leave Types

The system tracks multiple leave types:

- **Annual Leave:** Vacation time, accrued based on employment type
- **Sick Leave:** Illness-related absences
- **Personal Leave:** Personal appointments and family matters
- **Parental Leave:** Maternity/paternity leave
- **Study Leave:** Professional development time

### Accrual Rules

Leave accrues based on employment type and tenure:

```javascript
// Example accrual for full-time employee
entitlements: {
  paidTimeOff: {
    annualLeaveDays: 15,      // 15 days per year
    sickLeaveDays: 10,        // 10 days per year
    personalLeaveDays: 3      // 3 days per year
  }
}
```

### Pro-Rating for New Hires

Leave is automatically pro-rated based on hire date:

```javascript
// For employee hired in July (6 months remaining)
annualLeaveAvailable = (15 days / 12 months) * 6 months = 7.5 days
```

### Leave Balance Tracking

Real-time tracking of leave balances:

```javascript
leaveBalances: {
  annualLeave: {
    available: 12.5,          // Days available
    used: 2.5                 // Days used this year
  },
  lastUpdated: Date
}
```

---

## Payroll Calculations

### Overtime Calculations

Automatic overtime calculation based on employment type rules:

#### **Standard Overtime (1.5x rate)**
- After 8 hours in a day
- After 40 hours in a week

#### **Premium Overtime (2.0x rate)**
- After 12 hours in a day
- After 60 hours in a week
- Holiday work

#### **Weekend Rates**
- Saturday: 1.5x rate (if configured)
- Sunday: 2.0x rate (if configured)

### Payroll Calculation Example

```javascript
// Payroll for 45-hour week at $20/hour
{
  regularHours: 40,
  overtimeHours: 5,
  regularPay: 40 * $20 = $800,
  overtimePay: 5 * $20 * 1.5 = $150,
  totalGrossPay: $950
}
```

### Compliance Violations

The system tracks payroll-related violations:

- **Unpaid Overtime:** Hours worked but not properly classified
- **Missing Break Pay:** Compensation for missed meal breaks
- **Minimum Wage Violations:** Pay below legal minimums
- **Double Time Requirements:** Missed premium overtime payments

---

## Reporting & Analytics

### Compliance Dashboard

Real-time compliance monitoring:

- **Background Check Status:** Track completion and expiration
- **Certification Expiry Alerts:** 30-day advance warnings
- **Training Completion:** Monitor mandatory training status
- **Work Hour Violations:** Daily/weekly limit breaches

### Employment Type Analytics

Track workforce composition:

- **Distribution by Employment Type**
- **Average Hours by Classification**
- **Overtime Trends by Type**
- **Leave Usage Patterns**

### Audit Reports

Comprehensive audit trails for compliance:

```javascript
// Sample audit report
{
  reportPeriod: "Q1 2024",
  totalEmployees: 150,
  complianceIssues: {
    expiredBackgroundChecks: 3,
    missingTraining: 7,
    overtimeViolations: 2
  },
  recommendations: [
    "Schedule background check renewals",
    "Complete mandatory training for 7 employees",
    "Review overtime approval process"
  ]
}
```

---

## Setup and Configuration

### Initial Setup

1. **Create Employment Types**
   ```bash
   POST /api/hr/employment-types/default-setup
   ```

2. **Configure Work Hour Rules**
   - Set daily/weekly limits
   - Define overtime thresholds
   - Configure break requirements

3. **Set Up Compliance Requirements**
   - Background check policies
   - Drug testing requirements
   - Mandatory training programs

### User Registration with Employment Types

When creating new users, the system:

1. **Selects Employment Type** based on role and requirements
2. **Applies Work Schedule** from employment type defaults
3. **Initializes Leave Balances** based on entitlements
4. **Sets Compliance Requirements** based on position

### Employment Type Assignment

```javascript
// Assign employment type to user
PUT /api/hr/users/:id/employment-type
{
  employmentTypeId: "60f7b1b2c9e4b4001f5e4c89",
  effectiveDate: "2024-01-01",
  reason: "Promotion to full-time status"
}
```

### Bulk Operations

For large organizations, bulk operations are available:

- **Bulk Employment Type Updates**
- **Annual Leave Refresh**
- **Compliance Status Updates**
- **Training Assignment**

---

## Best Practices

### Employment Type Design

1. **Keep It Simple:** Start with standard types, add complexity as needed
2. **Clear Naming:** Use descriptive names that indicate hours and benefits
3. **Regular Review:** Update employment types as regulations change
4. **Documentation:** Maintain clear documentation of each type's rules

### Compliance Monitoring

1. **Automated Alerts:** Set up notifications for expiring certifications
2. **Regular Audits:** Schedule quarterly compliance reviews
3. **Training Schedules:** Plan mandatory training well in advance
4. **Exception Handling:** Have clear processes for handling violations

### Shift Scheduling

1. **Plan Ahead:** Use the validation system to catch conflicts early
2. **Employee Input:** Allow employees to set availability preferences
3. **Fair Distribution:** Rotate weekend and overtime opportunities
4. **Documentation:** Keep records of scheduling decisions and overrides

---

## Integration Examples

### API Usage

#### Create Employment Type
```javascript
POST /api/hr/employment-types
{
  "name": "Part-Time Seasonal",
  "code": "PT_SEASONAL",
  "category": "temporary",
  "classification": "part_time",
  "workHourRules": {
    "standardHoursPerWeek": 25,
    "maxHoursPerDay": 6,
    "maxHoursPerWeek": 30,
    "overtimeThreshold": {
      "daily": 6,
      "weekly": 30
    },
    "overtimeRates": {
      "standardOvertime": 1.5
    }
  }
}
```

#### Validate Shift
```javascript
POST /api/hr/validate-shift-scheduling
{
  "userId": "60f7b1b2c9e4b4001f5e4c89",
  "startTime": "2024-01-20T09:00:00Z",
  "endTime": "2024-01-20T18:00:00Z"
}
```

#### Calculate Payroll
```javascript
POST /api/hr/calculate-payroll
{
  "userId": "60f7b1b2c9e4b4001f5e4c89",
  "payPeriodStart": "2024-01-01",
  "payPeriodEnd": "2024-01-14"
}
```

### Frontend Integration

```jsx
// Using the HR compliance components
import HRCompliantShiftScheduler from '@/components/schedule/HRCompliantShiftScheduler';

<HRCompliantShiftScheduler
  selectedDate={selectedDate}
  onShiftCreated={handleShiftCreated}
  onShiftUpdated={handleShiftUpdated}
  existingShifts={shifts}
/>
```

---

## Troubleshooting

### Common Issues

#### **Employment Type Not Found**
- Verify employment type is active and not expired
- Check tenant association
- Ensure user has permission to view employment type

#### **Shift Scheduling Conflicts**
- Review weekly hour limits
- Check consecutive day restrictions
- Verify rest period requirements

#### **Payroll Calculation Errors**
- Confirm overtime thresholds are correctly set
- Verify employment type association
- Check for missing time entries

### Support Resources

- **System Administrator:** Employment type configuration
- **HR Department:** Compliance requirements and policies  
- **IT Support:** Technical integration and troubleshooting
- **Legal Counsel:** Labor law compliance verification

---

*This guide covers the comprehensive HR compliance features in StaffClock Pro. For specific implementation details, refer to the API documentation and technical guides.*