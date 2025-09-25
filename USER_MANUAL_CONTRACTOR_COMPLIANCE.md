# User Manual: Contractor Classification & South African Labor Law Compliance

## Table of Contents
1. [Quick Start Guide](#quick-start-guide)
2. [Understanding Worker Classifications](#understanding-worker-classifications)
3. [Creating Compliant Invoices](#creating-compliant-invoices)
4. [Managing Employee Relationships](#managing-employee-relationships)
5. [Tax Compliance](#tax-compliance)
6. [Common Scenarios](#common-scenarios)
7. [Troubleshooting](#troubleshooting)
8. [Legal Requirements Summary](#legal-requirements-summary)

## Quick Start Guide

### Before You Start
**⚠️ CRITICAL**: Only TRUE independent contractors can issue invoices under South African labor law. Employees must be paid through the payroll system.

### 3-Step Compliance Check
1. **Classify the Worker** → Use our classification tool
2. **Verify Eligibility** → Check if they can issue invoices
3. **Create Payment** → Invoice for contractors, payroll for employees

---

## Understanding Worker Classifications

### 🟢 CAN Issue Invoices (True Contractors)

#### Independent Contractor
**What they are**: Genuinely independent business providing services
**How they work**: 
- No supervision or control over HOW they work
- Use their own equipment and workspace
- Work for multiple clients
- Set their own schedule
- Bear commercial risk

**Example**: A freelance web developer who works from their home office, uses their own computer, serves multiple clients, and quotes fixed prices for projects.

#### Freelancer  
**What they are**: Project-based service providers
**How they work**:
- Work on specific projects with defined deliverables
- Usually work remotely
- Paid per project or deliverable
- Can work for multiple clients simultaneously

**Example**: A graphic designer who creates logos and marketing materials for various businesses, working from their own studio.

#### Consultant
**What they are**: Professional advisory service providers
**How they work**:
- Provide expert advice and recommendations
- High degree of professional independence
- Often have specialized qualifications
- Work on advisory basis, not operational tasks

**Example**: A business strategy consultant who analyzes company operations and provides recommendations, working independently without day-to-day supervision.

### 🔴 CANNOT Issue Invoices (Employees)

#### Fixed-Term Employee
**What they are**: Employees with a defined end date
**How they work**:
- Integrated into company operations
- Receive supervision and direction
- Work set hours at company premises
- Use company equipment
- Entitled to BCEA benefits

**Payment Method**: ✅ Salary through payroll ❌ Invoices

#### Temporary Employee
**What they are**: Short-term workers, often via labor brokers
**How they work**:
- Placed for specific temporary needs
- May work through Temporary Employment Services (TES)
- Follow company procedures and supervision
- Work company hours and location

**Payment Method**: ✅ Wages through payroll/TES ❌ Invoices

#### Casual Worker
**What they are**: Workers called in irregularly as needed
**How they work**:
- No guaranteed work schedule
- Called in when work is available
- Still subject to company control when working
- Limited but still entitled to some BCEA benefits

**Payment Method**: ✅ Wages when working ❌ Invoices

---

## Creating Compliant Invoices

### Step 1: Verify Contractor Status

**Before creating any invoice**, use the classification checker:

1. Navigate to **Contractors → Check Classification**
2. Enter worker details:
   - Do they work from a fixed company location? (Yes = Employee risk)
   - Do they have fixed working hours? (Yes = Employee risk)
   - Are they supervised in their daily work? (Yes = Employee risk)
   - Do they use primarily company equipment? (Yes = Employee risk)
   - Do they work exclusively for your company? (Yes = Employee risk)
   - Are they paid a regular salary? (Yes = Employee risk)

3. Review the risk assessment:
   - **LOW RISK**: ✅ Proceed with contractor invoice
   - **MEDIUM RISK**: ⚠️ Review arrangement first
   - **HIGH RISK**: ❌ Use payroll system instead

### Step 2: Create Invoice (Contractors Only)

1. Go to **Invoices → Create New Invoice**
2. Select contractor classification:
   - Independent Contractor ✅
   - Freelancer ✅  
   - Consultant ✅
   - ~~Fixed-Term Employee~~ ❌
   - ~~Temporary Employee~~ ❌

3. Fill in invoice details:
   - **Currency**: Must be ZAR for SA compliance
   - **Line Items**: Describe services provided
   - **VAT**: Apply 15% if contractor is VAT registered
   - **Tax Info**: Contractor's SA tax number (10 digits)

4. **System Validation**: The system will automatically check:
   - Classification allows invoicing ✅
   - Currency is ZAR ✅
   - Tax number format is valid ✅
   - VAT calculation is correct ✅

### Step 3: Submit for Approval

Invoices require approval to ensure compliance and proper authorization.

---

## Managing Employee Relationships

### When Someone CANNOT Issue Invoices

If the system blocks invoice creation, it means the worker is classified as an **employee** under SA labor law.

#### What to Do Instead:

1. **Create Employee Record**
   - Go to **Employees → Add New Employee**
   - Set up proper employment contract
   - Configure BCEA-compliant working conditions

2. **Set Up Payroll**
   - Monthly salary payments
   - PAYE tax deductions
   - UIF contributions
   - Annual leave allocation (21 days minimum)
   - Sick leave allocation (30 days per 3-year cycle)

3. **Required Registrations**
   - PAYE registration with SARS
   - UIF registration
   - SDL registration (if payroll > R500,000 annually)
   - Workers' compensation registration

### Employment Contract Requirements

For all employee relationships, ensure contracts include:
- Job description and reporting structure
- Working hours (max 45 hours/week per BCEA)
- Leave entitlements as per BCEA
- Disciplinary procedures
- Notice periods for termination

---

## Tax Compliance

### For Independent Contractors

#### Tax Registration Requirements:
- **Income Tax Registration**: All contractors need SA tax number
- **VAT Registration**: Required if annual turnover > R1 million
- **Tax Clearance Certificate**: Required for most business relationships

#### Invoice Requirements:
- Valid SA tax number (10 digits)
- VAT number if registered (10 digits starting with 4)
- Correct VAT rate (15% in South Africa)
- Proper invoice numbering

#### Example Valid Tax Info:
```
Tax Number: 1234567890 (10 digits)
VAT Number: 4123456789 (if VAT registered)
VAT Rate: 15%
```

### For Employees

#### Company Tax Obligations:
- **PAYE**: Deduct income tax from salaries
- **UIF**: 1% employee + 1% employer contribution
- **SDL**: 1% of payroll if annual payroll > R500,000
- **Workers' Comp**: Annual assessment and payments

---

## Common Scenarios

### Scenario 1: Software Developer
**Situation**: You need a software developer for 6 months

**Question**: Contractor or Employee?

**Analysis**:
- Will they work at your office daily? → Employee indicator
- Will you supervise their daily coding work? → Employee indicator  
- Will they use your computers and software licenses? → Employee indicator
- Are they working exclusively for you? → Employee indicator

**Recommendation**: Fixed-Term Employee
**Payment Method**: Salary with PAYE deductions

### Scenario 2: Logo Designer
**Situation**: You need a logo and brand identity created

**Analysis**:
- One-off project with specific deliverable → Contractor indicator
- They work from their own studio → Contractor indicator
- They use their own design software → Contractor indicator
- They have other clients → Contractor indicator
- You don't supervise HOW they design → Contractor indicator

**Recommendation**: Freelancer
**Payment Method**: Invoice upon project completion

### Scenario 3: Bookkeeper
**Situation**: You need someone to do monthly bookkeeping

**Analysis**:
- Regular, ongoing work → Employee indicator
- You need them available during business hours → Employee indicator
- They handle sensitive financial data → Employee indicator
- You provide training on your systems → Employee indicator

**Recommendation**: Part-Time Employee
**Payment Method**: Monthly salary with PAYE deductions

### Scenario 4: Business Consultant
**Situation**: You need strategic business advice

**Analysis**:
- Professional advisory role → Contractor indicator
- High-level expertise → Contractor indicator
- Makes recommendations, doesn't do operational work → Contractor indicator
- Has multiple client relationships → Contractor indicator

**Recommendation**: Consultant
**Payment Method**: Invoice for professional fees

---

## Troubleshooting

### Error: "South African Labor Law Violation"

**Problem**: System rejects invoice creation with labor law error.

**Cause**: Worker is classified as employee under SA law.

**Solution**: 
1. Review the worker relationship using control test
2. If genuinely independent → Change classification to contractor type
3. If employee-like → Use payroll system instead of invoicing

### Error: "Invalid Tax Number Format"

**Problem**: Tax number doesn't match SA format.

**Solutions**:
- SA Tax Number: Must be exactly 10 digits
- SA VAT Number: Must be 10 digits starting with 4
- Check for typos or extra characters

### Error: "Currency Must be ZAR"

**Problem**: Invoice uses non-ZAR currency.

**Solution**: Change currency to ZAR (South African Rand) for SA tax compliance.

### Warning: "HIGH RISK - Deemed Employment"

**Problem**: Worker shows strong employee characteristics.

**Action Required**:
1. Review the working relationship
2. Consider reclassifying as employee
3. Consult employment attorney if unsure

---

## Legal Requirements Summary

### Basic Conditions of Employment Act (BCEA)
- **Working Time**: Maximum 45 hours per week
- **Overtime**: 1.5x rate after 45 hours/week  
- **Rest**: 12 hours daily, 36 hours weekly
- **Annual Leave**: Minimum 21 days
- **Sick Leave**: 30 days per 3-year cycle

### Labour Relations Act (LRA)  
- Defines employment relationship
- Unfair dismissal protection
- Collective bargaining rights

### Income Tax Act
- PAYE obligations for employees
- Self-assessment for contractors
- Tax clearance requirements

### VAT Act
- VAT registration threshold: R1 million annually
- 15% VAT rate
- Proper invoice requirements

---

## Getting Help

### In-App Support
- **Classification Checker**: Use built-in tool for guidance
- **Compliance Info**: Each classification shows requirements
- **Error Messages**: System provides specific guidance

### Professional Support
Contact qualified professionals for:
- Complex worker relationships
- Large contractor arrangements  
- Disputed classifications
- Tax compliance issues

### Legal Resources
- **Department of Labour**: www.labour.gov.za
- **SARS (Tax Authority)**: www.sars.gov.za
- **CCMA**: www.ccma.org.za

---

## Quick Reference Card

### ✅ Can Issue Invoices
- Independent Contractor (truly independent)
- Freelancer (project-based)
- Consultant (advisory services)

### ❌ Cannot Issue Invoices - Use Payroll Instead
- Fixed-Term Employee (salary + PAYE)
- Temporary Employee (wages + PAYE)
- Casual Worker (wages when working)
- Labour Broker Employee (via TES payroll)

### Tax Number Formats
- **Tax Number**: 1234567890 (10 digits)
- **VAT Number**: 4123456789 (10 digits, starts with 4)
- **Company Reg**: 2024/123456/07 (YYYY/NNNNNN/NN format)

### Key Indicators
**Contractor**: Own equipment, multiple clients, no supervision, project-based
**Employee**: Company equipment, exclusive service, supervised, regular salary

---

**Remember**: When in doubt, err on the side of employee classification to avoid labor law violations. Consult professionals for complex situations.

**Last Updated**: December 2024