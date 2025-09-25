import mongoose from 'mongoose';
import ContractorInvoice from '../src/models/ContractorInvoice';
import EmploymentType from '../src/models/EmploymentType';
import logger from '../src/utils/logger';

/**
 * Migration to ensure compliance with South African labor law for contractor classifications
 * This migration:
 * 1. Reviews existing contractor invoices and flags potential violations
 * 2. Updates employment types to include country-specific compliance fields
 * 3. Adds compliance warnings where necessary
 */

interface MigrationResult {
  success: boolean;
  summary: {
    invoicesReviewed: number;
    complianceViolations: number;
    employmentTypesUpdated: number;
    warnings: string[];
    errors: string[];
  };
}

export async function migrateContractorClassificationCompliance(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    summary: {
      invoicesReviewed: 0,
      complianceViolations: 0,
      employmentTypesUpdated: 0,
      warnings: [],
      errors: []
    }
  };

  try {
    logger.info('Starting contractor classification compliance migration...');

    // 1. Review existing contractor invoices
    const existingInvoices = await ContractorInvoice.find({});
    result.summary.invoicesReviewed = existingInvoices.length;

    logger.info(`Found ${existingInvoices.length} existing contractor invoices to review`);

    for (const invoice of existingInvoices) {
      try {
        // Check if this classification can issue invoices under SA law
        const canIssueInvoices = ContractorInvoice.canContractorIssueInvoices(invoice.contractorClassification);
        const isEmployee = ContractorInvoice.isEmployeeUnderSALaw(invoice.contractorClassification);

        if (!canIssueInvoices) {
          result.summary.complianceViolations++;
          
          const complianceWarning = {
            type: 'LABOR_LAW_VIOLATION',
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            classification: invoice.contractorClassification,
            isEmployee,
            message: `Invoice ${invoice.invoiceNumber} violates SA labor law: ${invoice.contractorClassification} workers cannot issue invoices`,
            recommendation: isEmployee 
              ? 'Convert to payroll payment with PAYE/UIF deductions and BCEA benefits'
              : 'Review contractor classification and relationship',
            detectedAt: new Date()
          };

          // Add compliance warning to invoice without changing status
          if (!invoice.complianceChecks.contractorStatusVerified) {
            invoice.complianceChecks.contractorStatusVerified = false;
            
            // Add to communication log
            invoice.communicationLog.push({
              type: 'status_update',
              sentTo: [invoice.createdBy],
              subject: 'Labor Law Compliance Review Required',
              content: complianceWarning.message + '. ' + complianceWarning.recommendation,
              sentAt: new Date(),
              delivered: false
            });

            await invoice.save();
          }

          result.summary.warnings.push(`${complianceWarning.message} (Invoice: ${invoice.invoiceNumber})`);
          
          logger.warn('Compliance violation detected', complianceWarning);
        }

        // Update tax info structure if using legacy format
        if (invoice.southAfricanTaxInfo && !invoice.taxInfo) {
          invoice.taxInfo = {
            country: 'ZA',
            vatRegistered: invoice.southAfricanTaxInfo.vatRegistered,
            vatNumber: invoice.southAfricanTaxInfo.vatNumber,
            taxNumber: invoice.southAfricanTaxInfo.taxNumber,
            companyRegistrationNumber: invoice.southAfricanTaxInfo.companyRegistrationNumber,
            companyType: invoice.southAfricanTaxInfo.companyType,
            countrySpecificData: {
              beeLevel: invoice.southAfricanTaxInfo.beeLevel,
              payeReference: invoice.southAfricanTaxInfo.payeReference,
              uifContributor: invoice.southAfricanTaxInfo.uifContributor
            }
          };
          await invoice.save();
        }

      } catch (invoiceError) {
        const errorMsg = `Error processing invoice ${invoice.invoiceNumber}: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`;
        result.summary.errors.push(errorMsg);
        logger.error(errorMsg, invoiceError);
      }
    }

    // 2. Update employment types with compliance information
    const existingEmploymentTypes = await EmploymentType.find({});
    
    for (const empType of existingEmploymentTypes) {
      try {
        let updated = false;

        // Add country-specific requirements if missing
        if (!empType.compliance.countrySpecificRequirements) {
          if (empType.compliance.jurisdiction === 'ZA') {
            // Add South African specific requirements
            if (empType.category === 'contract' && empType.code.includes('INDEP')) {
              empType.compliance.countrySpecificRequirements = {
                mustPassControlTest: true,
                cannotBeSupervised: true,
                mustUseOwnEquipment: true,
                canWorkMultipleClients: true,
                excludedFromBCEA: true,
                noEmployeeBenefits: true
              };
              updated = true;
            } else {
              empType.compliance.countrySpecificRequirements = {
                coverredByBCEA: true,
                entitledToLeave: true,
                entitledToOvertime: true,
                payeWithholding: true,
                uifContributions: true
              };
              updated = true;
            }
          }
        }

        // Ensure jurisdiction is set (default to ZA if not specified)
        if (!empType.compliance.jurisdiction) {
          empType.compliance.jurisdiction = 'ZA';
          updated = true;
        }

        if (updated) {
          await empType.save();
          result.summary.employmentTypesUpdated++;
        }

      } catch (empTypeError) {
        const errorMsg = `Error updating employment type ${empType.name}: ${empTypeError instanceof Error ? empTypeError.message : 'Unknown error'}`;
        result.summary.errors.push(errorMsg);
        logger.error(errorMsg, empTypeError);
      }
    }

    // 3. Generate compliance report
    const complianceReport = {
      totalInvoices: result.summary.invoicesReviewed,
      compliantInvoices: result.summary.invoicesReviewed - result.summary.complianceViolations,
      violationRate: result.summary.invoicesReviewed > 0 
        ? ((result.summary.complianceViolations / result.summary.invoicesReviewed) * 100).toFixed(2) + '%'
        : '0%',
      employmentTypesUpdated: result.summary.employmentTypesUpdated,
      migrationCompletedAt: new Date()
    };

    logger.info('Contractor classification compliance migration completed', complianceReport);

    if (result.summary.complianceViolations > 0) {
      result.summary.warnings.push(
        `Found ${result.summary.complianceViolations} potential labor law violations that require review`
      );
    }

    result.success = result.summary.errors.length === 0;

    return result;

  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.summary.errors.push(errorMsg);
    logger.error('Contractor classification compliance migration failed', error);
    return result;
  }
}

/**
 * Rollback function (limited - cannot undo compliance warnings but can revert structure changes)
 */
export async function rollbackContractorClassificationCompliance(): Promise<{ success: boolean; message: string }> {
  try {
    logger.info('Starting rollback of contractor classification compliance migration...');

    // Remove added country-specific requirements from employment types
    await EmploymentType.updateMany(
      { 'compliance.countrySpecificRequirements': { $exists: true } },
      { $unset: { 'compliance.countrySpecificRequirements': 1 } }
    );

    // Note: We cannot safely remove compliance warnings from invoices as they may be legitimate
    // Manual review is recommended for any flagged invoices

    logger.info('Rollback completed - manual review recommended for flagged compliance issues');
    
    return {
      success: true,
      message: 'Migration rollback completed. Manual review recommended for any flagged compliance issues.'
    };

  } catch (error) {
    logger.error('Rollback failed', error);
    return {
      success: false,
      message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// CLI runner
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/staff_klok')
    .then(async () => {
      console.log('Connected to MongoDB');
      
      const result = await migrateContractorClassificationCompliance();
      
      console.log('\n=== Migration Results ===');
      console.log(`Success: ${result.success}`);
      console.log(`Invoices reviewed: ${result.summary.invoicesReviewed}`);
      console.log(`Compliance violations found: ${result.summary.complianceViolations}`);
      console.log(`Employment types updated: ${result.summary.employmentTypesUpdated}`);
      
      if (result.summary.warnings.length > 0) {
        console.log('\n=== Warnings ===');
        result.summary.warnings.forEach((warning, index) => {
          console.log(`${index + 1}. ${warning}`);
        });
      }
      
      if (result.summary.errors.length > 0) {
        console.log('\n=== Errors ===');
        result.summary.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }
      
      console.log('\n=== Next Steps ===');
      if (result.summary.complianceViolations > 0) {
        console.log('1. Review flagged invoices for SA labor law compliance');
        console.log('2. Convert employee relationships to payroll system');
        console.log('3. Ensure proper contractor agreements for true contractors');
        console.log('4. Verify tax registration and compliance for all contractors');
      } else {
        console.log('No compliance violations detected. System is compliant with SA labor law.');
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Database connection failed:', error);
      process.exit(1);
    });
}