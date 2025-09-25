import { TimeEntry } from '@/contexts/TimeTrackingContext';
import { User } from '@/contexts/AuthContext';

// Excel export utility (would use xlsx library in production)
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  dateRange: { start: Date; end: Date };
  includePayroll?: boolean;
  includeSummary?: boolean;
  groupBy?: 'employee' | 'department' | 'date';
}

export interface PayrollData {
  employeeId: string;
  employeeName: string;
  department: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  hourlyRate: number;
  overtimeRate: number;
}

export class ExportManager {
  static calculatePayroll(entries: TimeEntry[], users: User[]): PayrollData[] {
    const payrollMap = new Map<string, PayrollData>();

    entries.forEach(entry => {
      if (!entry.clockOut) return;

      const user = users.find(u => u.id === entry.userId);
      if (!user) return;

      const hourlyRate = user.hourlyRate || 15.00;
      const overtimeRate = hourlyRate * 1.5;

      if (!payrollMap.has(entry.userId)) {
        payrollMap.set(entry.userId, {
          employeeId: entry.userId,
          employeeName: entry.userName,
          department: user.department || 'Unknown',
          regularHours: 0,
          overtimeHours: 0,
          totalHours: 0,
          regularPay: 0,
          overtimePay: 0,
          totalPay: 0,
          hourlyRate,
          overtimeRate,
        });
      }

      const payroll = payrollMap.get(entry.userId)!;
      const totalHours = entry.totalHours || 0;
      const overtimeHours = entry.overtimeHours || 0;
      const regularHours = totalHours - overtimeHours;

      payroll.regularHours += regularHours;
      payroll.overtimeHours += overtimeHours;
      payroll.totalHours += totalHours;
      payroll.regularPay += regularHours * hourlyRate;
      payroll.overtimePay += overtimeHours * overtimeRate;
      payroll.totalPay += (regularHours * hourlyRate) + (overtimeHours * overtimeRate);
    });

    return Array.from(payrollMap.values());
  }

  static exportToCSV(entries: TimeEntry[], users: User[], options: ExportOptions): void {
    let csvContent = '';
    
    if (options.includePayroll) {
      const payrollData = this.calculatePayroll(entries, users);
      
      csvContent = [
        // Payroll CSV Headers
        ['Employee ID', 'Employee Name', 'Department', 'Regular Hours', 'Overtime Hours', 
         'Total Hours', 'Hourly Rate', 'Regular Pay', 'Overtime Pay', 'Total Pay'].join(','),
        
        // Payroll Data
        ...payrollData.map(p => [
          p.employeeId,
          p.employeeName,
          p.department,
          p.regularHours.toFixed(2),
          p.overtimeHours.toFixed(2),
          p.totalHours.toFixed(2),
          `$${p.hourlyRate.toFixed(2)}`,
          `$${p.regularPay.toFixed(2)}`,
          `$${p.overtimePay.toFixed(2)}`,
          `$${p.totalPay.toFixed(2)}`
        ].join(','))
      ].join('\n');
    } else {
      // Standard timesheet CSV
      csvContent = [
        ['Employee Name', 'Employee ID', 'Date', 'Clock In', 'Clock Out', 
         'Break Start', 'Break End', 'Total Hours', 'Overtime Hours', 'Location', 
         'Status', 'Approved By', 'Notes'].join(','),
        
        ...entries.map(entry => [
          entry.userName,
          entry.userId,
          entry.clockIn.toLocaleDateString(),
          entry.clockIn.toLocaleTimeString(),
          entry.clockOut?.toLocaleTimeString() || 'Still clocked in',
          entry.breakStart?.toLocaleTimeString() || '',
          entry.breakEnd?.toLocaleTimeString() || '',
          entry.totalHours?.toFixed(2) || '0',
          entry.overtimeHours?.toFixed(2) || '0',
          entry.location || '',
          entry.isApproved ? 'Approved' : 'Pending',
          entry.approvedBy || '',
          entry.notes || ''
        ].join(','))
      ].join('\n');
    }

    this.downloadFile(csvContent, 'text/csv', this.generateFileName('csv', options));
  }

  // Mock Excel export (would use xlsx library)
  static exportToExcel(entries: TimeEntry[], users: User[], options: ExportOptions): void {
    // In a real implementation, this would use the xlsx library:
    /*
    import * as XLSX from 'xlsx';
    
    const workbook = XLSX.utils.book_new();
    
    // Timesheet worksheet
    const timesheetData = entries.map(entry => ({
      'Employee Name': entry.userName,
      'Employee ID': entry.userId,
      'Date': entry.clockIn.toLocaleDateString(),
      'Clock In': entry.clockIn.toLocaleTimeString(),
      'Clock Out': entry.clockOut?.toLocaleTimeString() || 'Still clocked in',
      'Total Hours': entry.totalHours?.toFixed(2) || '0',
      'Overtime Hours': entry.overtimeHours?.toFixed(2) || '0',
      'Location': entry.location || '',
      'Status': entry.isApproved ? 'Approved' : 'Pending',
      'Notes': entry.notes || ''
    }));
    
    const timesheetWs = XLSX.utils.json_to_sheet(timesheetData);
    XLSX.utils.book_append_sheet(workbook, timesheetWs, 'Timesheet');
    
    if (options.includePayroll) {
      const payrollData = this.calculatePayroll(entries, users);
      const payrollWs = XLSX.utils.json_to_sheet(payrollData.map(p => ({
        'Employee ID': p.employeeId,
        'Employee Name': p.employeeName,
        'Department': p.department,
        'Regular Hours': p.regularHours.toFixed(2),
        'Overtime Hours': p.overtimeHours.toFixed(2),
        'Total Hours': p.totalHours.toFixed(2),
        'Hourly Rate': `$${p.hourlyRate.toFixed(2)}`,
        'Regular Pay': `$${p.regularPay.toFixed(2)}`,
        'Overtime Pay': `$${p.overtimePay.toFixed(2)}`,
        'Total Pay': `$${p.totalPay.toFixed(2)}`
      })));
      XLSX.utils.book_append_sheet(workbook, payrollWs, 'Payroll');
    }
    
    if (options.includeSummary) {
      const summaryData = this.generateSummaryData(entries, users);
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');
    }
    
    XLSX.writeFile(workbook, this.generateFileName('xlsx', options));
    */
    
    // For now, show a mock implementation alert
    const excelData = this.prepareExcelData(entries, users, options);
    alert(`Excel export ready with ${excelData.sheets.length} worksheets:\n${excelData.sheets.map(s => s.name).join(', ')}\n\nTo implement: npm install xlsx`);
  }

  static prepareExcelData(entries: TimeEntry[], users: User[], options: ExportOptions) {
    const sheets = [];
    
    // Main timesheet data
    sheets.push({
      name: 'Timesheet',
      data: entries.map(entry => ({
        'Employee Name': entry.userName,
        'Employee ID': entry.userId,
        'Date': entry.clockIn.toLocaleDateString(),
        'Clock In': entry.clockIn.toLocaleTimeString(),
        'Clock Out': entry.clockOut?.toLocaleTimeString() || 'Still clocked in',
        'Break Start': entry.breakStart?.toLocaleTimeString() || '',
        'Break End': entry.breakEnd?.toLocaleTimeString() || '',
        'Total Hours': entry.totalHours?.toFixed(2) || '0',
        'Overtime Hours': entry.overtimeHours?.toFixed(2) || '0',
        'Location': entry.location || '',
        'Status': entry.isApproved ? 'Approved' : 'Pending',
        'Approved By': entry.approvedBy || '',
        'Notes': entry.notes || ''
      }))
    });

    if (options.includePayroll) {
      const payrollData = this.calculatePayroll(entries, users);
      sheets.push({
        name: 'Payroll',
        data: payrollData.map(p => ({
          'Employee ID': p.employeeId,
          'Employee Name': p.employeeName,
          'Department': p.department,
          'Regular Hours': p.regularHours.toFixed(2),
          'Overtime Hours': p.overtimeHours.toFixed(2),
          'Total Hours': p.totalHours.toFixed(2),
          'Hourly Rate': `$${p.hourlyRate.toFixed(2)}`,
          'Regular Pay': `$${p.regularPay.toFixed(2)}`,
          'Overtime Pay': `$${p.overtimePay.toFixed(2)}`,
          'Total Pay': `$${p.totalPay.toFixed(2)}`
        }))
      });
    }

    if (options.includeSummary) {
      sheets.push({
        name: 'Summary',
        data: this.generateSummaryData(entries, users)
      });
    }

    return { sheets, totalEntries: entries.length };
  }

  static generateSummaryData(entries: TimeEntry[], users: User[]) {
    const totalHours = entries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    const totalOvertime = entries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0);
    const payrollData = this.calculatePayroll(entries, users);
    const totalPay = payrollData.reduce((sum, p) => sum + p.totalPay, 0);

    return [
      { Metric: 'Total Entries', Value: entries.length },
      { Metric: 'Total Hours', Value: totalHours.toFixed(2) },
      { Metric: 'Total Overtime Hours', Value: totalOvertime.toFixed(2) },
      { Metric: 'Total Payroll', Value: `$${totalPay.toFixed(2)}` },
      { Metric: 'Average Hours per Entry', Value: (totalHours / Math.max(entries.length, 1)).toFixed(2) },
      { Metric: 'Employees Included', Value: new Set(entries.map(e => e.userId)).size },
    ];
  }

  static exportToPDF(entries: TimeEntry[], users: User[], options: ExportOptions): void {
    // Mock PDF implementation - would use jsPDF or similar
    alert('PDF export would be implemented with jsPDF library for professional timesheet formatting');
  }

  static backupData(entries: TimeEntry[], users: User[]): void {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      timeEntries: entries,
      users: users.map(u => ({ ...u, pin: undefined })), // Remove PINs for security
      metadata: {
        totalEntries: entries.length,
        totalUsers: users.length,
        dateRange: {
          start: entries.length > 0 ? Math.min(...entries.map(e => e.clockIn.getTime())) : null,
          end: entries.length > 0 ? Math.max(...entries.map(e => e.clockIn.getTime())) : null
        }
      }
    };

    const jsonContent = JSON.stringify(backupData, null, 2);
    this.downloadFile(jsonContent, 'application/json', `staffclock-backup-${new Date().toISOString().split('T')[0]}.json`);
  }

  static restoreData(file: File): Promise<{ timeEntries: TimeEntry[], users: User[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backupData = JSON.parse(e.target?.result as string);
          
          // Validate backup format
          if (!backupData.timeEntries || !backupData.users) {
            throw new Error('Invalid backup file format');
          }

          // Convert date strings back to Date objects
          const timeEntries = backupData.timeEntries.map((entry: any) => ({
            ...entry,
            clockIn: new Date(entry.clockIn),
            clockOut: entry.clockOut ? new Date(entry.clockOut) : undefined,
            breakStart: entry.breakStart ? new Date(entry.breakStart) : undefined,
            breakEnd: entry.breakEnd ? new Date(entry.breakEnd) : undefined,
          }));

          resolve({ timeEntries, users: backupData.users });
        } catch (error) {
          reject(new Error('Failed to parse backup file'));
        }
      };
      reader.readAsText(file);
    });
  }

  private static generateFileName(extension: string, options: ExportOptions): string {
    const dateStr = new Date().toISOString().split('T')[0];
    const rangeStr = `${options.dateRange.start.toISOString().split('T')[0]}_to_${options.dateRange.end.toISOString().split('T')[0]}`;
    const type = options.includePayroll ? 'payroll' : 'timesheet';
    return `staffclock-${type}-${rangeStr}-${dateStr}.${extension}`;
  }

  private static downloadFile(content: string, mimeType: string, fileName: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}