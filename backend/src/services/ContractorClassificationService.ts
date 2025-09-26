import { ContractorClassification } from '../models/ContractorInvoice';

/**
 * Service to validate and manage contractor classifications under South African labor law
 * Ensures compliance with BCEA, Labour Relations Act, and Income Tax Act
 */
export class ContractorClassificationService {
  
  /**
   * Validate if a worker can be classified as requested type under SA law
   */
  static validateClassification(
    requestedClassification: ContractorClassification,
    workerDetails: {
      hasFixedWorkplace?: boolean;
      hasFixedHours?: boolean;
      isSupervised?: boolean;
      usesCompanyEquipment?: boolean;
      hasOtherClients?: boolean;
      receivesTraining?: boolean;
      hasEmployeeBenefits?: boolean;
      paidRegularSalary?: boolean;
      canSubstitute?: boolean;
    }
  ): { isValid: boolean; warnings: string[]; recommendations: string[] } {
    
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let isValid = true;
    
    // Calculate "employee risk score" based on control factors
    let employeeRiskScore = 0;
    
    if (workerDetails.hasFixedWorkplace) employeeRiskScore += 2;
    if (workerDetails.hasFixedHours) employeeRiskScore += 2;
    if (workerDetails.isSupervised) employeeRiskScore += 3;
    if (workerDetails.usesCompanyEquipment) employeeRiskScore += 2;
    if (!workerDetails.hasOtherClients) employeeRiskScore += 2;
    if (workerDetails.receivesTraining) employeeRiskScore += 1;
    if (workerDetails.hasEmployeeBenefits) employeeRiskScore += 3;
    if (workerDetails.paidRegularSalary) employeeRiskScore += 3;
    if (!workerDetails.canSubstitute) employeeRiskScore += 1;
    
    const trueContractorTypes = ['independent_contractor', 'freelancer', 'consultant'];
    const employeeTypes = ['fixed_term_employee', 'temporary_employee', 'casual_worker', 'labour_broker_employee'];
    
    // Validate requested classification
    if (trueContractorTypes.includes(requestedClassification)) {
      // Requesting contractor status - check if they qualify
      if (employeeRiskScore >= 12) {
        isValid = false;
        warnings.push(
          'HIGH RISK: Worker shows strong employee characteristics. ' +
          'This classification likely violates SA labour law and may result in deemed employment.'
        );
        recommendations.push('Consider reclassifying as fixed_term_employee or permanent employee');
      } else if (employeeRiskScore >= 8) {
        warnings.push(
          'MEDIUM RISK: Worker shows some employee characteristics. ' +
          'Review arrangement to ensure true contractor relationship.'
        );
        recommendations.push('Strengthen contractor independence to reduce deemed employment risk');
      } else if (employeeRiskScore >= 5) {
        warnings.push(
          'LOW RISK: Some employee-like factors present but likely acceptable as contractor'
        );
      }
      
      // Specific contractor requirements
      if (requestedClassification === 'independent_contractor') {
        if (!workerDetails.hasOtherClients) {
          warnings.push('Independent contractors should typically have multiple clients');
        }
        if (!workerDetails.canSubstitute) {
          warnings.push('Independent contractors should be able to send substitutes');
        }
      }
      
    } else if (employeeTypes.includes(requestedClassification)) {
      // Requesting employee status - always valid but check if contractor might be better
      if (employeeRiskScore < 3) {
        warnings.push(
          'Worker shows strong contractor characteristics. ' +
          'Consider if independent contractor classification might be more appropriate.'
        );
      }
    }
    
    return { isValid, warnings, recommendations };
  }
  
  /**
   * Get detailed compliance requirements for each classification
   */
  static getComplianceRequirements(classification: ContractorClassification) {
    const requirements = {
      'independent_contractor': {
        paymentMethod: 'Must issue invoices only - no salary payments',
        taxObligations: 'Self-responsible for income tax, VAT (if applicable)',
        benefits: 'No BCEA benefits - not entitled to leave, overtime, etc.',
        workArrangement: 'Must work independently without supervision',
        equipment: 'Must use own tools/equipment where possible',
        exclusivity: 'Should have multiple clients or ability to work for others',
        documentation: [
          'Signed independent contractor agreement',
          'Tax clearance certificate',
          'VAT registration (if turnover > R1 million)',
          'Professional indemnity insurance (recommended)'
        ],
        complianceRisks: [
          'Deemed employment if too much control exercised',
          'SARS may reclassify as employee for tax purposes',
          'Labour court may find employment relationship exists'
        ]
      },
      'freelancer': {
        paymentMethod: 'Invoice-based payments for specific projects/deliverables',
        taxObligations: 'Self-responsible for income tax, VAT (if applicable)',
        benefits: 'No employee benefits - commercial service provider',
        workArrangement: 'Project-based work with delivery deadlines',
        equipment: 'Uses own equipment and works from own location',
        exclusivity: 'Typically works for multiple clients',
        documentation: [
          'Service agreement for each project',
          'Tax clearance certificate',
          'Portfolio of work/credentials'
        ],
        complianceRisks: [
          'Regular, ongoing work may suggest employment',
          'Fixed hours/location may indicate employee relationship'
        ]
      },
      'consultant': {
        paymentMethod: 'Professional fees via invoices',
        taxObligations: 'Self-responsible for income tax, VAT (if applicable)',
        benefits: 'No employee benefits - professional service provider',
        workArrangement: 'Advisory/expert services with professional independence',
        equipment: 'Professional tools and workspace independent of client',
        exclusivity: 'Should maintain multiple client relationships',
        documentation: [
          'Professional services agreement',
          'Professional qualifications/certifications',
          'Professional indemnity insurance',
          'Tax clearance certificate'
        ],
        complianceRisks: [
          'Day-to-day operational work may suggest employment',
          'Long-term exclusive arrangements may indicate employment'
        ]
      },
      'fixed_term_employee': {
        paymentMethod: 'Salary/wages through payroll with PAYE deduction',
        taxObligations: 'Company deducts PAYE, UIF, SDL, and submits to SARS',
        benefits: 'Full BCEA entitlements: leave, overtime, public holidays',
        workArrangement: 'Integrated into company operations with supervision',
        equipment: 'Company provides necessary tools and equipment',
        exclusivity: 'Exclusive service during working hours',
        documentation: [
          'Fixed-term employment contract',
          'IRP5 tax certificate',
          'UIF registration',
          'Skills development plan'
        ],
        complianceRisks: [
          'Cannot exceed 3 months without permanent employment',
          'Automatic conversion to permanent after qualifying period',
          'Must justify fixed-term necessity'
        ]
      },
      'temporary_employee': {
        paymentMethod: 'Hourly/daily wages through payroll or TES',
        taxObligations: 'PAYE, UIF deductions by company or labour broker',
        benefits: 'Prorated BCEA benefits based on service period',
        workArrangement: 'Temporary assignment with defined end date',
        equipment: 'Company/client provides necessary equipment',
        exclusivity: 'Service exclusively to assigned client',
        documentation: [
          'Temporary employment contract',
          'TES registration (if via labour broker)',
          'Assignment letter',
          'IRP5 tax certificate'
        ],
        complianceRisks: [
          'TES Act compliance required if via labour broker',
          'Client and broker joint liability',
          'May acquire permanent rights after 3 months'
        ]
      },
      'casual_worker': {
        paymentMethod: 'Irregular wage payments when work is available',
        taxObligations: 'PAYE deductions if earnings exceed threshold',
        benefits: 'Limited BCEA benefits after 4 months continuous service',
        workArrangement: 'Irregular, as-needed work availability',
        equipment: 'Company provides equipment when working',
        exclusivity: 'Not exclusive - can work elsewhere when available',
        documentation: [
          'Casual work agreement',
          'Attendance records',
          'Payment records',
          'IRP5 (if PAYE applicable)'
        ],
        complianceRisks: [
          'Regular pattern may create permanent employment',
          'BCEA benefits kick in after qualifying period',
          'Must genuinely be irregular work'
        ]
      },
      'labour_broker_employee': {
        paymentMethod: 'Wages through labour broker payroll system',
        taxObligations: 'Labour broker handles all tax deductions and submissions',
        benefits: 'Full BCEA benefits through broker arrangement',
        workArrangement: 'Placed at client but employed by broker',
        equipment: 'Client provides equipment, broker manages employment',
        exclusivity: 'Service to assigned client during placement',
        documentation: [
          'TES (labour broker) registration certificate',
          'Tripartite employment contract',
          'Placement agreement',
          'Joint liability acknowledgment'
        ],
        complianceRisks: [
          'TES Act strict compliance requirements',
          'Joint and several liability with client',
          'Equal treatment requirements',
          'Prohibited for certain occupations'
        ]
      }
    };
    
    return requirements[classification] || {
      paymentMethod: 'Consult legal advice',
      taxObligations: 'Consult legal and tax advice',
      benefits: 'Consult legal advice',
      workArrangement: 'Classification unclear',
      documentation: ['Legal review required'],
      complianceRisks: ['Unrecognized classification - high compliance risk']
    };
  }
  
  /**
   * Determine recommended classification based on work arrangement
   */
  static recommendClassification(workDetails: {
    hasFixedWorkplace: boolean;
    hasFixedHours: boolean;
    isSupervised: boolean;
    usesCompanyEquipment: boolean;
    hasOtherClients: boolean;
    receivesTraining: boolean;
    hasEmployeeBenefits: boolean;
    paidRegularSalary: boolean;
    canSubstitute: boolean;
    workDuration: 'short_term' | 'medium_term' | 'long_term';
    workType: 'core_business' | 'specialized' | 'temporary' | 'project';
  }): { 
    recommendedClassification: ContractorClassification;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string[];
  } {
    
    const reasoning: string[] = [];
    let contractorScore = 0;
    let employeeScore = 0;
    
    // Scoring system based on SA labour law factors
    if (workDetails.hasFixedWorkplace) {
      employeeScore += 2;
      reasoning.push('Fixed workplace suggests employee relationship');
    } else {
      contractorScore += 2;
      reasoning.push('Flexible workplace supports contractor classification');
    }
    
    if (workDetails.hasFixedHours) {
      employeeScore += 3;
      reasoning.push('Fixed working hours strongly suggest employment');
    } else {
      contractorScore += 3;
      reasoning.push('Flexible hours support contractor independence');
    }
    
    if (workDetails.isSupervised) {
      employeeScore += 4;
      reasoning.push('Direct supervision is key indicator of employment');
    } else {
      contractorScore += 4;
      reasoning.push('Independent work arrangement supports contractor status');
    }
    
    if (workDetails.usesCompanyEquipment) {
      employeeScore += 2;
      reasoning.push('Using company equipment suggests employee relationship');
    } else {
      contractorScore += 2;
      reasoning.push('Own equipment supports contractor independence');
    }
    
    if (workDetails.hasOtherClients) {
      contractorScore += 3;
      reasoning.push('Multiple clients strongly support contractor status');
    } else {
      employeeScore += 2;
      reasoning.push('Exclusive service suggests employee relationship');
    }
    
    if (workDetails.paidRegularSalary) {
      employeeScore += 4;
      reasoning.push('Regular salary is strong indicator of employment');
    } else {
      contractorScore += 3;
      reasoning.push('Project/invoice-based payment supports contractor status');
    }
    
    // Determine classification based on scores and other factors
    let recommendedClassification: ContractorClassification;
    let confidence: 'high' | 'medium' | 'low';
    
    if (contractorScore > employeeScore + 3) {
      // Clear contractor indicators
      if (workDetails.workType === 'specialized') {
        recommendedClassification = 'consultant';
        reasoning.push('Specialized work best suited to consultant arrangement');
      } else if (workDetails.workType === 'project') {
        recommendedClassification = 'freelancer';
        reasoning.push('Project-based work suits freelancer classification');
      } else {
        recommendedClassification = 'independent_contractor';
        reasoning.push('Work arrangement suits independent contractor status');
      }
      confidence = 'high';
    } else if (employeeScore > contractorScore + 3) {
      // Clear employee indicators
      if (workDetails.workDuration === 'short_term') {
        if (workDetails.workType === 'temporary') {
          recommendedClassification = 'temporary_employee';
          reasoning.push('Short-term temporary work suggests temporary employee');
        } else {
          recommendedClassification = 'fixed_term_employee';
          reasoning.push('Short-term but structured work suggests fixed-term employee');
        }
      } else {
        recommendedClassification = 'fixed_term_employee';
        reasoning.push('Employee-like arrangement suggests fixed-term employment');
      }
      confidence = 'high';
    } else {
      // Mixed indicators - default to employee for safety
      recommendedClassification = 'fixed_term_employee';
      reasoning.push('Mixed indicators - defaulting to employee classification for legal safety');
      confidence = 'low';
    }
    
    return { recommendedClassification, confidence, reasoning };
  }
  
  /**
   * Generate contractor agreement template based on classification
   */
  static getContractTemplate(classification: ContractorClassification): string {
    const templates = {
      'independent_contractor': `
INDEPENDENT CONTRACTOR AGREEMENT (South Africa)

IMPORTANT: This agreement creates a commercial relationship, NOT an employment relationship.

1. CONTRACTOR STATUS
   - Contractor is an independent service provider
   - No employment relationship exists or is intended
   - Contractor responsible for own tax affairs including PAYE, VAT, UIF
   - No BCEA benefits apply (leave, overtime, etc.)

2. WORK ARRANGEMENT
   - Contractor has full discretion over HOW work is performed
   - No fixed working hours or workplace supervision
   - Contractor may use substitutes or subcontractors
   - Multiple client relationships permitted and encouraged

3. PAYMENT TERMS
   - Payment ONLY upon submission of proper invoice
   - No salary, wages, or employee-type payments
   - Contractor handles own VAT registration if required
   - 30-day payment terms from invoice receipt

4. TERMINATION
   - Either party may terminate with notice as agreed
   - No severance pay or employment-type benefits on termination
   - Outstanding invoices paid according to terms

This agreement complies with SA Labour Relations Act provisions for genuine contractor relationships.
      `,
      'fixed_term_employee': `
FIXED-TERM EMPLOYMENT CONTRACT (South Africa - BCEA Compliant)

1. EMPLOYMENT RELATIONSHIP
   - This creates an employment relationship subject to BCEA
   - Employee entitled to all labour law protections
   - Company responsible for PAYE, UIF, SDL deductions

2. WORKING CONDITIONS
   - Working hours: 45 hours per week maximum (BCEA Section 9)
   - Overtime: 1.5x rate after 45 hours per week
   - Rest periods: 12 consecutive hours daily, 36 hours weekly

3. BENEFITS AND ENTITLEMENTS
   - Annual leave: 21 days per annum (BCEA Section 20)
   - Sick leave: 36 days per 3-year cycle (BCEA Section 22)
   - Family responsibility leave: 3 days per annum
   - Public holiday pay as per BCEA

4. SALARY AND DEDUCTIONS
   - Gross salary paid monthly through payroll
   - PAYE, UIF, and SDL deducted as per SARS requirements
   - Salary review annually or as per company policy

This contract complies with the Basic Conditions of Employment Act and Labour Relations Act.
      `,
      'freelancer': `
FREELANCE SERVICES AGREEMENT (South Africa)

IMPORTANT: This agreement creates a commercial relationship for project-based services.

1. FREELANCER STATUS
   - Freelancer is an independent service provider
   - Specializes in specific project deliverables
   - Responsible for own tax affairs including PAYE, VAT if applicable
   - No BCEA benefits apply

2. PROJECT SCOPE
   - Work defined by specific project deliverables
   - Freelancer has discretion over methods and timing
   - May work remotely or from own workspace
   - Can engage with multiple clients simultaneously

3. PAYMENT TERMS
   - Payment upon completion of agreed deliverables
   - Invoice-based payment system only
   - Project-based or milestone-based payments
   - 30-day payment terms from invoice receipt

This agreement complies with SA Labour Relations Act for genuine project-based services.
      `,
      'consultant': `
CONSULTING SERVICES AGREEMENT (South Africa)

IMPORTANT: This agreement is for professional advisory services only.

1. CONSULTANT STATUS
   - Consultant provides professional advisory services
   - High degree of professional independence
   - Responsible for own tax affairs including PAYE, VAT
   - No BCEA benefits apply

2. ADVISORY NATURE
   - Provides expert advice and recommendations
   - Does not perform operational or administrative tasks
   - Professional expertise and qualifications required
   - Multiple client relationships expected

3. PAYMENT TERMS
   - Professional fees invoiced monthly or per engagement
   - Payment based on time or fixed project fees
   - Consultant handles own VAT registration if required
   - 30-day payment terms from invoice receipt

This agreement complies with SA professional services regulations.
      `,
      'temporary_employee': `
TEMPORARY EMPLOYMENT CONTRACT (South Africa - BCEA Compliant)

⚠️ IMPORTANT: This is an EMPLOYMENT relationship. Worker CANNOT issue invoices.

1. EMPLOYMENT RELATIONSHIP
   - This creates a temporary employment relationship under BCEA
   - Employee entitled to labour law protections
   - Company responsible for PAYE, UIF deductions
   - May be placed via Temporary Employment Services (TES)

2. WORKING CONDITIONS
   - Working hours as per BCEA (45 hours/week maximum)
   - Overtime rates apply after standard hours
   - Daily and weekly rest periods required

3. BENEFITS (Pro-rata basis)
   - Annual leave earned pro-rata
   - Sick leave entitlement as per BCEA
   - Public holiday pay applicable

4. PAYMENT METHOD
   - ✅ WAGES through payroll system
   - ❌ NO INVOICES PERMITTED
   - PAYE and UIF deducted by company

This contract complies with BCEA and TES Act provisions.
      `,
      'casual_worker': `
CASUAL WORKER AGREEMENT (South Africa - BCEA Compliant)

⚠️ IMPORTANT: This is an EMPLOYMENT relationship. Worker CANNOT issue invoices.

1. EMPLOYMENT RELATIONSHIP
   - Casual employment relationship under BCEA
   - Called to work on irregular basis
   - Still subject to labour law protections when working
   - Company responsible for tax deductions

2. WORK ARRANGEMENT
   - Work offered on availability basis
   - No guaranteed hours or regular schedule
   - Still supervised when working
   - Company equipment and premises used

3. LIMITED BENEFITS
   - Leave earned pro-rata based on time worked
   - Some BCEA protections apply
   - Basic working conditions must be met

4. PAYMENT METHOD
   - ✅ WAGES paid for time worked
   - ❌ NO INVOICES PERMITTED
   - PAYE deducted when earnings threshold met

This contract complies with BCEA provisions for casual employment.
      `,
      'labour_broker_employee': `
LABOUR BROKER PLACEMENT (South Africa - TES Act Compliant)

⚠️ IMPORTANT: This is an EMPLOYMENT relationship via labour broker. Worker CANNOT issue invoices.

1. EMPLOYMENT RELATIONSHIP
   - Employee of Temporary Employment Service (labour broker)
   - Placed at client company for specific period
   - Full employment rights under BCEA and TES Act
   - Labour broker responsible for employment obligations

2. TES ACT COMPLIANCE
   - Placement for genuine temporary business need
   - Equal treatment with permanent employees
   - Labour broker handles HR obligations
   - Client company provides work supervision

3. BENEFITS AND PROTECTIONS
   - Full BCEA benefits through labour broker
   - Equal pay for equal work principle
   - Labour law protections maintained
   - Right to join trade union

4. PAYMENT METHOD
   - ✅ WAGES paid via labour broker payroll
   - ❌ NO INVOICES PERMITTED
   - PAYE, UIF handled by labour broker

This arrangement complies with Temporary Employment Services Act.
      `
    };
    
    return templates[classification] || 'Standard template not available - consult legal counsel';
  }
}