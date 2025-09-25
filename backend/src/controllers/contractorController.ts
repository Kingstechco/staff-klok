import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenantResolver';
import User from '../models/User';
import Project from '../models/Project';
import TimeEntry from '../models/TimeEntry';
import logger from '../utils/logger';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

export class ContractorController {
  
  /**
   * Get all contractors for the tenant (Admin/Manager only)
   */
  static async getAllContractors(req: AuthRequest & TenantRequest, res: Response): Promise<void> {
    try {
      const contractors = await User.find({
        tenantId: req.tenant._id,
        role: 'contractor',
        isActive: true
      })
      .populate('contractorInfo.clients', 'name email clientContactInfo.companyName')
      .populate('manager', 'name email')
      .sort({ name: 1 });

      const contractorsWithStats = await Promise.all(
        contractors.map(async (contractor) => {
          // Get current month stats
          const now = new Date();
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);
          
          const monthlyEntries = await TimeEntry.find({
            userId: contractor._id,
            tenantId: req.tenant._id,
            clockIn: { $gte: monthStart, $lte: monthEnd }
          });
          
          const monthlyHours = monthlyEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
          const pendingApprovals = monthlyEntries.filter(entry => 
            entry.approvalStatus === 'pending'
          ).length;
          
          // Get active projects
          const activeProjects = await Project.find({
            tenantId: req.tenant._id,
            'assignedContractors.contractorId': contractor._id,
            'assignedContractors.isActive': true,
            status: 'active'
          });

          return {
            ...contractor.toObject(),
            stats: {
              monthlyHours,
              pendingApprovals,
              activeProjects: activeProjects.length,
              lastActivity: monthlyEntries.length > 0 ? 
                Math.max(...monthlyEntries.map(e => e.clockIn.getTime())) : null
            }
          };
        })
      );

      res.json({
        contractors: contractorsWithStats,
        summary: {
          totalContractors: contractors.length,
          totalMonthlyHours: contractorsWithStats.reduce((sum, c) => sum + c.stats.monthlyHours, 0),
          totalPendingApprovals: contractorsWithStats.reduce((sum, c) => sum + c.stats.pendingApprovals, 0)
        }
      });
    } catch (error) {
      logger.error('Get all contractors error:', error);
      res.status(500).json({ error: 'Failed to fetch contractors' });
    }
  }

  /**
   * Get detailed contractor timesheet data
   */
  static async getContractorTimesheet(req: AuthRequest & TenantRequest, res: Response): Promise<void> {
    try {
      const { contractorId } = req.params;
      const { startDate, endDate, projectId } = req.query;

      // Validate contractor exists and belongs to tenant
      const contractor = await User.findOne({
        _id: contractorId,
        tenantId: req.tenant._id,
        role: 'contractor',
        isActive: true
      }).populate('contractorInfo.clients', 'name clientContactInfo.companyName');

      if (!contractor) {
        res.status(404).json({ error: 'Contractor not found' });
        return;
      }

      // Build date range
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = parseISO(startDate as string);
      if (endDate) dateFilter.$lte = parseISO(endDate as string);

      // Build query
      const query: any = {
        userId: contractorId,
        tenantId: req.tenant._id
      };

      if (Object.keys(dateFilter).length > 0) {
        query.clockIn = dateFilter;
      }

      if (projectId) {
        query.projectId = projectId;
      }

      const entries = await TimeEntry.find(query)
        .populate('projectId', 'name code clientName billing.defaultRate')
        .populate('clientId', 'name clientContactInfo.companyName')
        .populate('approvals.approverId', 'name role')
        .sort({ clockIn: -1 });

      // Calculate summary statistics
      const summary = {
        totalEntries: entries.length,
        totalHours: entries.reduce((sum, e) => sum + (e.totalHours || 0), 0),
        regularHours: entries.reduce((sum, e) => sum + (e.regularHours || 0), 0),
        overtimeHours: entries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0),
        
        // Billing calculations
        billableAmount: entries.reduce((sum, entry) => {
          const rate = entry.projectId?.billing?.defaultRate || contractor.contractorInfo?.defaultProjectRate || 0;
          return sum + ((entry.totalHours || 0) * rate);
        }, 0),
        
        // Approval status
        approvalStatus: {
          pending: entries.filter(e => e.approvalStatus === 'pending').length,
          approved: entries.filter(e => e.approvalStatus === 'approved').length,
          rejected: entries.filter(e => e.approvalStatus === 'rejected').length,
          autoApproved: entries.filter(e => e.approvalStatus === 'auto_approved').length
        },
        
        // Project breakdown
        projectBreakdown: this.groupEntriesByProject(entries),
        
        // Daily breakdown
        dailyBreakdown: this.groupEntriesByDate(entries)
      };

      res.json({
        contractor: {
          id: contractor._id,
          name: contractor.name,
          email: contractor.email,
          contractorInfo: contractor.contractorInfo
        },
        entries,
        summary,
        period: {
          startDate: startDate || (entries.length > 0 ? entries[entries.length - 1].clockIn : new Date()),
          endDate: endDate || (entries.length > 0 ? entries[0].clockIn : new Date())
        }
      });
    } catch (error) {
      logger.error('Get contractor timesheet error:', error);
      res.status(500).json({ error: 'Failed to fetch contractor timesheet' });
    }
  }

  /**
   * Generate and download contractor timesheet
   */
  static async downloadContractorTimesheet(req: AuthRequest & TenantRequest, res: Response): Promise<void> {
    try {
      const { contractorId } = req.params;
      const { month, year, format: downloadFormat = 'csv', projectId } = req.query;

      const contractor = await User.findOne({
        _id: contractorId,
        tenantId: req.tenant._id,
        role: 'contractor'
      }).populate('contractorInfo.clients');

      if (!contractor) {
        res.status(404).json({ error: 'Contractor not found' });
        return;
      }

      // Calculate date range
      const targetMonth = parseInt(month as string) - 1; // Month is 0-based in JS
      const targetYear = parseInt(year as string);
      const startDate = new Date(targetYear, targetMonth, 1);
      const endDate = new Date(targetYear, targetMonth + 1, 0); // Last day of month

      const query: any = {
        userId: contractorId,
        tenantId: req.tenant._id,
        clockIn: { $gte: startDate, $lte: endDate }
      };

      if (projectId) {
        query.projectId = projectId;
      }

      const entries = await TimeEntry.find(query)
        .populate('projectId', 'name code clientName billing.defaultRate')
        .populate('clientId', 'name')
        .sort({ clockIn: 1 });

      const timesheetData = {
        contractor: {
          name: contractor.name,
          email: contractor.email,
          businessName: contractor.contractorInfo?.businessName,
          taxId: contractor.contractorInfo?.taxId
        },
        period: {
          month: month,
          year: year,
          startDate,
          endDate
        },
        entries: entries.map(entry => ({
          date: format(entry.clockIn, 'yyyy-MM-dd'),
          clockIn: format(entry.clockIn, 'HH:mm'),
          clockOut: entry.clockOut ? format(entry.clockOut, 'HH:mm') : '',
          totalHours: entry.totalHours || 0,
          regularHours: entry.regularHours || 0,
          overtimeHours: entry.overtimeHours || 0,
          project: entry.projectId?.name || 'No Project',
          projectCode: entry.projectId?.code || '',
          client: entry.projectId?.clientName || '',
          rate: entry.projectId?.billing?.defaultRate || contractor.contractorInfo?.defaultProjectRate || 0,
          amount: (entry.totalHours || 0) * (entry.projectId?.billing?.defaultRate || contractor.contractorInfo?.defaultProjectRate || 0),
          description: entry.taskDescription || '',
          status: entry.approvalStatus,
          notes: entry.notes || ''
        })),
        summary: {
          totalHours: entries.reduce((sum, e) => sum + (e.totalHours || 0), 0),
          totalAmount: entries.reduce((sum, e) => {
            const rate = e.projectId?.billing?.defaultRate || contractor.contractorInfo?.defaultProjectRate || 0;
            return sum + ((e.totalHours || 0) * rate);
          }, 0)
        }
      };

      if (downloadFormat === 'csv') {
        const csv = this.generateTimesheetCSV(timesheetData);
        const filename = `timesheet-${contractor.name.replace(/\s+/g, '_')}-${year}-${month}.csv`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
      } else if (downloadFormat === 'pdf') {
        const pdf = await this.generateTimesheetPDF(timesheetData);
        const filename = `timesheet-${contractor.name.replace(/\s+/g, '_')}-${year}-${month}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdf);
      } else {
        res.json(timesheetData);
      }
    } catch (error) {
      logger.error('Download contractor timesheet error:', error);
      res.status(500).json({ error: 'Failed to generate timesheet' });
    }
  }

  /**
   * Bulk approve contractor timesheets
   */
  static async bulkApproveTimesheets(req: AuthRequest & TenantRequest, res: Response): Promise<void> {
    try {
      const { entryIds, approvalNotes, approverType = 'manager' } = req.body;

      if (!Array.isArray(entryIds) || entryIds.length === 0) {
        res.status(400).json({ error: 'Entry IDs are required' });
        return;
      }

      const results = await Promise.allSettled(
        entryIds.map(async (entryId: string) => {
          const entry = await TimeEntry.findOne({
            _id: entryId,
            tenantId: req.tenant._id
          });

          if (!entry) {
            throw new Error(`Entry ${entryId} not found`);
          }

          // Add approval record
          entry.approvals.push({
            approverId: req.user._id,
            approverType: approverType as 'manager' | 'client',
            status: 'approved',
            timestamp: new Date(),
            notes: approvalNotes
          });

          entry.approvalStatus = 'approved';
          await entry.save();

          return { entryId, status: 'approved' };
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      res.json({
        message: `Bulk approval completed: ${successful} successful, ${failed} failed`,
        successful,
        failed,
        results: results.map((result, index) => ({
          entryId: entryIds[index],
          status: result.status === 'fulfilled' ? 'success' : 'failed',
          error: result.status === 'rejected' ? result.reason.message : undefined
        }))
      });
    } catch (error) {
      logger.error('Bulk approve timesheets error:', error);
      res.status(500).json({ error: 'Failed to approve timesheets' });
    }
  }

  /**
   * Get contractor dashboard overview (for contracting companies)
   */
  static async getContractorDashboard(req: AuthRequest & TenantRequest, res: Response): Promise<void> {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

      // Get all contractors
      const contractors = await User.find({
        tenantId: req.tenant._id,
        role: 'contractor',
        isActive: true
      });

      // Get time entries for current month
      const monthlyEntries = await TimeEntry.find({
        tenantId: req.tenant._id,
        userId: { $in: contractors.map(c => c._id) },
        clockIn: { $gte: monthStart }
      }).populate('userId', 'name');

      // Get active projects
      const activeProjects = await Project.find({
        tenantId: req.tenant._id,
        status: 'active'
      });

      // Calculate statistics
      const stats = {
        contractors: {
          total: contractors.length,
          active: monthlyEntries.reduce((acc, entry) => {
            acc.add(entry.userId._id.toString());
            return acc;
          }, new Set()).size
        },
        
        projects: {
          total: activeProjects.length,
          overBudget: activeProjects.filter(p => 
            p.budget?.amount && p.actualHours * p.billing.defaultRate > p.budget.amount
          ).length
        },
        
        timeEntries: {
          thisMonth: monthlyEntries.length,
          totalHours: monthlyEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0),
          pendingApprovals: monthlyEntries.filter(e => e.approvalStatus === 'pending').length,
          billableAmount: monthlyEntries.reduce((sum, entry) => {
            const contractor = contractors.find(c => c._id.toString() === entry.userId._id.toString());
            const rate = contractor?.contractorInfo?.defaultProjectRate || 0;
            return sum + ((entry.totalHours || 0) * rate);
          }, 0)
        },
        
        topContractors: await this.getTopContractors(req.tenant._id, monthStart),
        recentActivity: monthlyEntries.slice(-10).map(entry => ({
          contractorName: entry.userId.name,
          date: entry.clockIn,
          hours: entry.totalHours,
          project: entry.projectId,
          status: entry.approvalStatus
        }))
      };

      res.json(stats);
    } catch (error) {
      logger.error('Get contractor dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch contractor dashboard' });
    }
  }

  // Helper methods

  private static groupEntriesByProject(entries: any[]): any[] {
    const projectGroups = entries.reduce((acc, entry) => {
      const projectId = entry.projectId?._id?.toString() || 'no-project';
      if (!acc[projectId]) {
        acc[projectId] = {
          project: entry.projectId || { name: 'No Project', code: 'N/A' },
          entries: [],
          totalHours: 0,
          billableAmount: 0
        };
      }
      acc[projectId].entries.push(entry);
      acc[projectId].totalHours += entry.totalHours || 0;
      acc[projectId].billableAmount += (entry.totalHours || 0) * (entry.projectId?.billing?.defaultRate || 0);
      return acc;
    }, {});

    return Object.values(projectGroups);
  }

  private static groupEntriesByDate(entries: any[]): any[] {
    const dateGroups = entries.reduce((acc, entry) => {
      const date = format(entry.clockIn, 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = {
          date,
          entries: [],
          totalHours: 0
        };
      }
      acc[date].entries.push(entry);
      acc[date].totalHours += entry.totalHours || 0;
      return acc;
    }, {});

    return Object.values(dateGroups).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }

  private static generateTimesheetCSV(data: any): string {
    const headers = [
      'Date', 'Clock In', 'Clock Out', 'Total Hours', 'Regular Hours', 'Overtime Hours',
      'Project', 'Project Code', 'Client', 'Rate', 'Amount', 'Description', 'Status', 'Notes'
    ];

    const rows = data.entries.map((entry: any) => [
      entry.date,
      entry.clockIn,
      entry.clockOut,
      entry.totalHours,
      entry.regularHours,
      entry.overtimeHours,
      entry.project,
      entry.projectCode,
      entry.client,
      entry.rate,
      entry.amount,
      `"${entry.description}"`,
      entry.status,
      `"${entry.notes}"`
    ]);

    const csvContent = [
      // Header information
      `Contractor: ${data.contractor.name}`,
      `Period: ${data.period.month}/${data.period.year}`,
      `Total Hours: ${data.summary.totalHours}`,
      `Total Amount: $${data.summary.totalAmount.toFixed(2)}`,
      '', // Empty line
      headers.join(','),
      ...rows.map(row => row.join(','))
    ];

    return csvContent.join('\n');
  }

  private static async generateTimesheetPDF(data: any): Promise<Buffer> {
    // This would integrate with a PDF generation library like puppeteer or pdfkit
    // For now, return a placeholder
    return Buffer.from('PDF generation not implemented yet');
  }

  private static async getTopContractors(tenantId: string, monthStart: Date): Promise<any[]> {
    const result = await TimeEntry.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          clockIn: { $gte: monthStart }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalHours: { $sum: '$totalHours' },
          entryCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'contractor'
        }
      },
      {
        $unwind: '$contractor'
      },
      {
        $sort: { totalHours: -1 }
      },
      {
        $limit: 5
      }
    ]);

    return result.map(item => ({
      id: item._id,
      name: item.contractor.name,
      totalHours: item.totalHours,
      entryCount: item.entryCount
    }));
  }
}