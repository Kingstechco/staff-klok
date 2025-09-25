import ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs/promises';
import { ITimeEntry } from '../models/TimeEntry';
import { IUser } from '../models/User';
import logger from './logger';

interface ExportData {
  timeEntries: ITimeEntry[];
  users?: IUser[];
}

interface ExportOptions {
  format: 'csv' | 'excel';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeDetails?: boolean;
}

// Ensure export directory exists
const ensureExportDir = async (): Promise<string> => {
  const exportDir = process.env.EXPORT_PATH || './exports';
  
  try {
    await fs.access(exportDir);
  } catch {
    await fs.mkdir(exportDir, { recursive: true });
  }
  
  return exportDir;
};

// Format time entry data for export
const formatTimeEntryForExport = (entry: any, includeDetails: boolean = false) => {
  const user = entry.userId;
  const baseData = {
    employeeName: user?.name || 'Unknown',
    email: user?.email || '',
    department: user?.department || '',
    position: user?.position || '',
    clockInDate: entry.clockIn?.toLocaleDateString() || '',
    clockInTime: entry.clockIn?.toLocaleTimeString() || '',
    clockOutDate: entry.clockOut?.toLocaleDateString() || '',
    clockOutTime: entry.clockOut?.toLocaleTimeString() || '',
    totalHours: entry.totalHours || 0,
    regularHours: entry.regularHours || 0,
    overtimeHours: entry.overtimeHours || 0,
    breakTime: entry.totalBreakTime || 0,
    status: entry.status,
    isApproved: entry.isApproved ? 'Yes' : 'No',
    approvedBy: entry.approvedBy?.name || '',
    notes: entry.notes || ''
  };

  if (includeDetails) {
    return {
      ...baseData,
      hourlyRate: user?.hourlyRate || 0,
      overtimeRate: user?.overtimeRate || 1.5,
      regularPay: ((user?.hourlyRate || 0) * (entry.regularHours || 0)).toFixed(2),
      overtimePay: ((user?.hourlyRate || 0) * (user?.overtimeRate || 1.5) * (entry.overtimeHours || 0)).toFixed(2),
      totalPay: ((user?.hourlyRate || 0) * (entry.regularHours || 0) + 
                 (user?.hourlyRate || 0) * (user?.overtimeRate || 1.5) * (entry.overtimeHours || 0)).toFixed(2),
      location: entry.location?.address || '',
      latitude: entry.location?.latitude || '',
      longitude: entry.location?.longitude || ''
    };
  }

  return baseData;
};

// Export to CSV
export const exportToCSV = async (data: ExportData, options: ExportOptions): Promise<string> => {
  try {
    const exportDir = await ensureExportDir();
    const filename = `timesheet_export_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`;
    const filepath = path.join(exportDir, filename);

    const headers = [
      { id: 'employeeName', title: 'Employee Name' },
      { id: 'email', title: 'Email' },
      { id: 'department', title: 'Department' },
      { id: 'position', title: 'Position' },
      { id: 'clockInDate', title: 'Clock In Date' },
      { id: 'clockInTime', title: 'Clock In Time' },
      { id: 'clockOutDate', title: 'Clock Out Date' },
      { id: 'clockOutTime', title: 'Clock Out Time' },
      { id: 'totalHours', title: 'Total Hours' },
      { id: 'regularHours', title: 'Regular Hours' },
      { id: 'overtimeHours', title: 'Overtime Hours' },
      { id: 'breakTime', title: 'Break Time (mins)' },
      { id: 'status', title: 'Status' },
      { id: 'isApproved', title: 'Approved' },
      { id: 'approvedBy', title: 'Approved By' },
      { id: 'notes', title: 'Notes' }
    ];

    if (options.includeDetails) {
      headers.push(
        { id: 'hourlyRate', title: 'Hourly Rate' },
        { id: 'overtimeRate', title: 'Overtime Rate' },
        { id: 'regularPay', title: 'Regular Pay' },
        { id: 'overtimePay', title: 'Overtime Pay' },
        { id: 'totalPay', title: 'Total Pay' },
        { id: 'location', title: 'Location' },
        { id: 'latitude', title: 'Latitude' },
        { id: 'longitude', title: 'Longitude' }
      );
    }

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: headers
    });

    const records = data.timeEntries.map(entry => 
      formatTimeEntryForExport(entry, options.includeDetails)
    );

    await csvWriter.writeRecords(records);
    
    logger.info(`CSV export created: ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error('CSV export error:', error);
    throw new Error('Failed to create CSV export');
  }
};

// Export to Excel
export const exportToExcel = async (data: ExportData, options: ExportOptions): Promise<string> => {
  try {
    const exportDir = await ensureExportDir();
    const filename = `timesheet_export_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;
    const filepath = path.join(exportDir, filename);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Timesheet Export');

    // Add metadata
    worksheet.addRow(['Generated:', new Date().toLocaleString()]);
    if (options.dateRange) {
      worksheet.addRow(['Date Range:', `${options.dateRange.start.toLocaleDateString()} - ${options.dateRange.end.toLocaleDateString()}`]);
    }
    worksheet.addRow(['Total Records:', data.timeEntries.length]);
    worksheet.addRow([]); // Empty row

    // Headers
    const headers = [
      'Employee Name', 'Email', 'Department', 'Position',
      'Clock In Date', 'Clock In Time', 'Clock Out Date', 'Clock Out Time',
      'Total Hours', 'Regular Hours', 'Overtime Hours', 'Break Time (mins)',
      'Status', 'Approved', 'Approved By', 'Notes'
    ];

    if (options.includeDetails) {
      headers.push(
        'Hourly Rate', 'Overtime Rate', 'Regular Pay', 'Overtime Pay', 'Total Pay',
        'Location', 'Latitude', 'Longitude'
      );
    }

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Data rows
    data.timeEntries.forEach(entry => {
      const formattedData = formatTimeEntryForExport(entry, options.includeDetails);
      const values = [
        formattedData.employeeName,
        formattedData.email,
        formattedData.department,
        formattedData.position,
        formattedData.clockInDate,
        formattedData.clockInTime,
        formattedData.clockOutDate,
        formattedData.clockOutTime,
        formattedData.totalHours,
        formattedData.regularHours,
        formattedData.overtimeHours,
        formattedData.breakTime,
        formattedData.status,
        formattedData.isApproved,
        formattedData.approvedBy,
        formattedData.notes
      ];

      if (options.includeDetails) {
        values.push(
          (formattedData as any).hourlyRate,
          (formattedData as any).overtimeRate,
          (formattedData as any).regularPay,
          (formattedData as any).overtimePay,
          (formattedData as any).totalPay,
          (formattedData as any).location,
          (formattedData as any).latitude,
          (formattedData as any).longitude
        );
      }

      worksheet.addRow(values);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.header) {
        column.width = Math.max(12, column.header.toString().length + 2);
      }
    });

    // Add summary sheet if detailed
    if (options.includeDetails && data.users) {
      const summarySheet = workbook.addWorksheet('Summary');
      
      summarySheet.addRow(['Employee Summary Report']);
      summarySheet.addRow([]);

      const summaryHeaders = ['Employee', 'Total Hours', 'Regular Hours', 'Overtime Hours', 'Total Pay'];
      const summaryHeaderRow = summarySheet.addRow(summaryHeaders);
      summaryHeaderRow.font = { bold: true };

      // Calculate summary per employee
      const employeeSummary = new Map();
      data.timeEntries.forEach(entry => {
        const user = entry.userId;
        const userId = user._id.toString();
        
        if (!employeeSummary.has(userId)) {
          employeeSummary.set(userId, {
            name: (user as any).name,
            totalHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            totalPay: 0
          });
        }

        const summary = employeeSummary.get(userId);
        summary.totalHours += entry.totalHours || 0;
        summary.regularHours += entry.regularHours || 0;
        summary.overtimeHours += entry.overtimeHours || 0;
        const userObj = user as any;
        summary.totalPay += (userObj.hourlyRate || 0) * (entry.regularHours || 0) + 
                           (userObj.hourlyRate || 0) * (userObj.overtimeRate || 1.5) * (entry.overtimeHours || 0);
      });

      employeeSummary.forEach(summary => {
        summarySheet.addRow([
          summary.name,
          summary.totalHours.toFixed(2),
          summary.regularHours.toFixed(2),
          summary.overtimeHours.toFixed(2),
          summary.totalPay.toFixed(2)
        ]);
      });

      summarySheet.columns.forEach(column => {
        if (column.header) {
          column.width = Math.max(12, column.header.toString().length + 2);
        }
      });
    }

    await workbook.xlsx.writeFile(filepath);
    
    logger.info(`Excel export created: ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error('Excel export error:', error);
    throw new Error('Failed to create Excel export');
  }
};

// Main export function
export const createExport = async (
  data: ExportData, 
  options: ExportOptions
): Promise<string> => {
  if (options.format === 'csv') {
    return exportToCSV(data, options);
  } else if (options.format === 'excel') {
    return exportToExcel(data, options);
  } else {
    throw new Error('Unsupported export format');
  }
};

// Clean up old export files (call this periodically)
export const cleanupOldExports = async (maxAgeHours: number = 24): Promise<void> => {
  try {
    const exportDir = await ensureExportDir();
    const files = await fs.readdir(exportDir);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const file of files) {
      const filepath = path.join(exportDir, file);
      const stats = await fs.stat(filepath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filepath);
        logger.info(`Cleaned up old export file: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Export cleanup error:', error);
  }
};