# South African Labor Law Compliance Implementation

## Overview

This system implements **strict compliance with South African labor laws** to ensure proper classification of workers and prevent violations of the Basic Conditions of Employment Act (BCEA), Labour Relations Act (LRA), and related legislation.

## ⚠️ CRITICAL REQUIREMENT: Invoice Eligibility

**Only TRUE independent contractors can issue invoices. Employee relationships MUST use payroll systems.**

### Who CAN Issue Invoices ✅
- **Independent Contractors**: Truly independent service providers
- **Freelancers**: Project-based independent service providers  
- **Consultants**: Professional advisory service providers

### Who CANNOT Issue Invoices ❌
- **Fixed-Term Employees**: Must receive salary with PAYE/UIF deductions
- **Temporary Employees**: Must receive wages through payroll or TES
- **Casual Workers**: Must receive wages when work is available
- **Labour Broker Employees**: Must receive wages through broker payroll

## South African Labor Law Framework

### Key Legislation
1. **Basic Conditions of Employment Act (BCEA)** - Working conditions, leave, overtime
2. **Labour Relations Act (LRA)** - Employment relationships, unfair dismissal
3. **Temporary Employment Services Act (TES Act)** - Labour brokers, temporary work
4. **Income Tax Act** - Tax obligations for contractors vs employees
5. **VAT Act** - VAT registration and obligations for contractors

### The "Control Test"
SA courts use the control test to determine true contractor vs employee status:

**Contractor Indicators** ✅
- Works without direct supervision
- Uses own equipment and tools
- Can work for multiple clients
- Sets own working hours
- Can send substitutes
- Bears commercial risk
- Issues invoices for services

**Employee Indicators** ❌  
- Receives direct supervision
- Uses company equipment
- Works fixed hours at fixed location
- Exclusive to one employer
- Cannot substitute themselves
- Receives regular salary/wages
- Entitled to employee benefits

## Implementation Details

### 1. Contractor Classification Model

```typescript
export type ContractorClassification = 
  | 'independent_contractor' // TRUE CONTRACTOR: Issues invoices, own tax/VAT responsibility
  | 'fixed_term_employee'    // EMPLOYEE: Fixed salary, company handles tax, BCEA benefits
  | 'temporary_employee'     // EMPLOYEE: Hourly/daily via labor broker, company handles tax
  | 'consultant'            // TRUE CONTRACTOR: Project-based independent service provider
  | 'freelancer'            // TRUE CONTRACTOR: Independent service provider
  | 'casual_worker'         // EMPLOYEE: Irregular work, limited benefits, company handles tax
  | 'labour_broker_employee'; // EMPLOYEE: Via TES Act, company handles tax through broker
```

### 2. Validation Logic

The system enforces strict validation:

```typescript
// Pre-save validation in ContractorInvoice model
if (!trueContractorTypes.includes(this.contractorClassification)) {
  if (employeeTypes.includes(this.contractorClassification)) {
    throw new Error(
      `SA Labor Law Violation: ${this.contractorClassification} workers are EMPLOYEES, not contractors. ` +
      `They cannot issue invoices and must be paid salary/wages with PAYE tax deduction, UIF contributions, ` +
      `and are entitled to BCEA benefits. Use timesheet system instead of invoices.`
    );
  }
}
```

### 3. API Endpoints

#### Check Contractor Eligibility
```
POST /api/contractor-invoices/check-eligibility
```
Validates if a worker classification can issue invoices under SA law.

#### Get Classification Recommendation  
```
POST /api/contractor-invoices/recommend-classification
```
Recommends proper classification based on work arrangement details.

#### Get Compliance Requirements
```
GET /api/contractor-invoices/compliance/:classification
```
Returns detailed compliance requirements for each classification type.

### 4. Employment Types

South African employment types with BCEA compliance:

#### Permanent Employee (SA_PERM_EMP)
- **Working Hours**: 45 hours/week maximum (BCEA Section 9)
- **Overtime**: 1.5x after 45 hours/week (BCEA Section 10)  
- **Annual Leave**: 21 days minimum (BCEA Section 20)
- **Sick Leave**: 30 days per 3-year cycle (BCEA Section 22)
- **Payment**: Salary through payroll with PAYE/UIF deductions

#### Independent Contractor (SA_INDEP_CONTRACT)
- **Working Hours**: Not bound by BCEA - commercial arrangement
- **Payment**: Invoice-based ONLY - no salary payments
- **Benefits**: No BCEA benefits - not an employee
- **Tax**: Self-responsible for income tax and VAT (if applicable)
- **Equipment**: Must use own tools where possible

### 5. Tax Compliance

#### For Independent Contractors
- Self-responsible for income tax returns
- VAT registration required if annual turnover > R1 million
- Must obtain tax clearance certificate
- Professional indemnity insurance recommended

#### For Employees  
- Company deducts PAYE (Pay-As-You-Earn) tax
- Company pays UIF (Unemployment Insurance Fund) contributions
- Company pays SDL (Skills Development Levy) if applicable
- Employee receives IRP5 tax certificate

### 6. Risk Assessment

The system includes automated risk assessment for contractor arrangements:

```typescript
const validation = ContractorClassificationService.validateClassification(
  'independent_contractor', 
  {
    hasFixedWorkplace: false,    // ✅ Contractor indicator
    hasFixedHours: false,        // ✅ Contractor indicator  
    isSupervised: false,         // ✅ Contractor indicator
    usesCompanyEquipment: false, // ✅ Contractor indicator
    hasOtherClients: true,       // ✅ Strong contractor indicator
    paidRegularSalary: false     // ✅ Contractor indicator
  }
);
```

**Risk Levels:**
- **LOW RISK**: Clear contractor relationship
- **MEDIUM RISK**: Some employee-like factors - review needed
- **HIGH RISK**: Strong employee indicators - likely deemed employment

### 7. Migration and Data Compliance

Migration script reviews existing data for compliance violations:

```bash
npm run migrate:contractor-compliance
```

This migration:
1. Reviews all existing contractor invoices
2. Flags potential SA labor law violations
3. Updates employment types with compliance fields
4. Generates compliance report

## Compliance Checklist

### For Organizations

- [ ] Review all contractor relationships using the control test
- [ ] Ensure proper written agreements (contractor vs employment contracts)
- [ ] Verify tax registrations for all contractors
- [ ] Implement proper payroll for employee relationships
- [ ] Maintain compliance documentation

### For True Contractors

- [ ] Obtain tax clearance certificate
- [ ] Register for VAT if turnover > R1 million annually
- [ ] Maintain professional indemnity insurance
- [ ] Use own equipment and workspace where possible
- [ ] Maintain multiple client relationships
- [ ] Issue proper invoices (not timesheets)

### For Employees

- [ ] Provide written employment contracts
- [ ] Ensure PAYE and UIF registrations
- [ ] Implement BCEA-compliant working conditions
- [ ] Provide required leave entitlements
- [ ] Issue monthly payslips and annual IRP5s

## Common Violations and Penalties

### Deemed Employment Risk
If CCMA or Labour Court finds contractor is actually employee:
- Backdated benefits and leave pay
- UIF and SDL contributions owed
- Potential unfair dismissal claims
- SARS may reclassify for tax purposes

### Tax Compliance Issues
- SARS penalties for incorrect tax treatment
- Interest on unpaid PAYE and UIF
- Criminal liability for willful non-compliance

### Recommended Actions
1. **Regular Reviews**: Annual review of all contractor relationships
2. **Documentation**: Maintain proper contracts and work evidence
3. **Training**: Educate managers on contractor vs employee distinctions
4. **Legal Support**: Consult employment attorneys for complex cases

## API Usage Examples

### Check if Worker Can Issue Invoices

```typescript
const response = await fetch('/api/contractor-invoices/check-eligibility', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contractorClassification: 'independent_contractor',
    workerDetails: {
      hasFixedWorkplace: false,
      hasFixedHours: false,
      isSupervised: false,
      usesCompanyEquipment: false,
      hasOtherClients: true,
      paidRegularSalary: false
    }
  })
});

const result = await response.json();
console.log(result.data.canIssueInvoices); // true for valid contractors
```

### Create Compliant Invoice

```typescript
const invoiceData = {
  contractorId: 'contractor_object_id',
  contractorClassification: 'independent_contractor', // ✅ Allowed
  currency: 'ZAR',
  lineItems: [
    {
      description: 'Software Development Services',
      quantity: 40,
      unitRate: 500,
      units: 'hours',
      totalAmount: 20000
    }
  ],
  subtotal: 20000,
  vatAmount: 3000,  // If VAT registered
  vatRate: 15,
  totalAmount: 23000,
  taxInfo: {
    country: 'ZA',
    vatRegistered: true,
    vatNumber: '4123456789',
    taxNumber: '1234567890',
    companyType: 'individual'
  },
  paymentTerms: 'Net 30 days'
};

const response = await fetch('/api/contractor-invoices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(invoiceData)
});
```

### Handle Employee Classification Error

```typescript
try {
  const invalidInvoice = {
    contractorClassification: 'fixed_term_employee', // ❌ Not allowed
    // ... other invoice data
  };
  
  await fetch('/api/contractor-invoices', {
    method: 'POST',
    body: JSON.stringify(invalidInvoice)
  });
} catch (error) {
  // Will receive error: "SA Labor Law Violation: fixed_term_employee workers are EMPLOYEES..."
  // Redirect user to payroll system instead
}
```

## System Architecture

### Database Models
- `ContractorInvoice` - Strict validation for SA labor law
- `EmploymentType` - Country-specific compliance fields
- `Organization` - KYC/KYB with SA requirements

### Services
- `ContractorClassificationService` - Worker classification logic
- `SouthAfricanComplianceProvider` - SA-specific compliance rules
- `OrganizationVerificationService` - Internationalized compliance

### Controllers
- `ContractorInvoiceController` - API endpoints with validation
- Comprehensive error handling for compliance violations
- Educational responses explaining SA labor law requirements

## Testing

Comprehensive test suite covers:
- Valid contractor classifications ✅
- Invalid employee classifications ❌  
- Edge cases and mixed indicators
- Tax validation for SA formats
- Migration script functionality

```bash
npm test -- tests/unit/contractorClassification.test.ts
```

## Support and Resources

### Legal Resources
- Department of Labour: www.labour.gov.za
- CCMA (Dispute Resolution): www.ccma.org.za
- SARS (Tax Authority): www.sars.gov.za

### Professional Support
- Employment law attorneys
- Tax practitioners  
- HR compliance consultants

---

**⚠️ IMPORTANT**: This system provides technical compliance tools but does not constitute legal advice. Organizations should consult qualified employment attorneys and tax practitioners for complex situations.

**Last Updated**: December 2024  
**Compliance Version**: SA-2024-v1.0