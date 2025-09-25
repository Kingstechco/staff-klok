'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { contractorAPI } from '../../utils/api';

interface ContractorStats {
  monthlyHours: number;
  pendingApprovals: number;
  activeProjects: number;
  lastActivity: number | null;
}

interface Contractor {
  _id: string;
  name: string;
  email?: string;
  contractorInfo?: {
    businessName?: string;
    clients: any[];
    defaultProjectRate?: number;
    specializations: string[];
  };
  stats: ContractorStats;
}

interface DashboardData {
  contractors: Contractor[];
  summary: {
    totalContractors: number;
    totalMonthlyHours: number;
    totalPendingApprovals: number;
  };
}

const ContractorManagementDashboard: React.FC = () => {
  const { currentUser, currentTenant, canManageContractors } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Check permissions
  if (!canManageContractors()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to access the contractor management dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Load contractor data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await contractorAPI.getAllContractors({
          status: filterStatus === 'all' ? undefined : filterStatus
        });
        
        setDashboardData(data);
      } catch (err: any) {
        console.error('Failed to load contractor data:', err);
        setError(err.message || 'Failed to load contractor data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [filterStatus]);

  // Filter contractors based on search
  const filteredContractors = dashboardData?.contractors.filter(contractor =>
    contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.contractorInfo?.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDownloadTimesheet = async (contractorId: string, contractorName: string) => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const blob = await contractorAPI.downloadContractorTimesheet(contractorId, {
        month: currentMonth,
        year: currentYear,
        format: 'csv'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `timesheet-${contractorName.replace(/\s+/g, '_')}-${currentYear}-${currentMonth.toString().padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download failed:', err);
      alert(`Failed to download timesheet: ${err.message}`);
    }
  };

  const formatLastActivity = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading contractor dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Contractor Management</h1>
                <p className="text-gray-600">
                  {currentTenant?.name} - {currentUser?.role === 'client_contact' ? 'Client Portal' : 'Admin Dashboard'}
                </p>
              </div>
              <div className="flex space-x-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Contractors</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                <input
                  type="text"
                  placeholder="Search contractors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        {dashboardData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {dashboardData.summary.totalContractors}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Contractors</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData.summary.totalContractors} active
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">⏱️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Monthly Hours</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {Math.round(dashboardData.summary.totalMonthlyHours)} hours
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">⏳</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending Approvals</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData.summary.totalPendingApprovals}
                        {dashboardData.summary.totalPendingApprovals > 0 && (
                          <span className="text-sm text-yellow-600 ml-1">needs review</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contractors Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Contractor Overview ({filteredContractors.length})
            </h3>
            
            {filteredContractors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No contractors found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contractor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Business Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pending Approvals
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredContractors.map((contractor) => (
                      <tr 
                        key={contractor._id} 
                        className={selectedContractor === contractor._id ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {contractor.name}
                            </div>
                            {contractor.email && (
                              <div className="text-sm text-gray-500">{contractor.email}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            {contractor.contractorInfo?.businessName && (
                              <div className="text-sm text-gray-900">
                                {contractor.contractorInfo.businessName}
                              </div>
                            )}
                            {contractor.contractorInfo?.specializations && contractor.contractorInfo.specializations.length > 0 && (
                              <div className="text-sm text-gray-500">
                                {contractor.contractorInfo.specializations.slice(0, 2).join(', ')}
                                {contractor.contractorInfo.specializations.length > 2 && '...'}
                              </div>
                            )}
                            {contractor.contractorInfo?.defaultProjectRate && (
                              <div className="text-sm text-gray-500">
                                ${contractor.contractorInfo.defaultProjectRate}/hr
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {Math.round(contractor.stats.monthlyHours)}h
                          </div>
                          <div className="text-sm text-gray-500">
                            {contractor.stats.activeProjects} projects
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {contractor.stats.pendingApprovals > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {contractor.stats.pendingApprovals} pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Up to date
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatLastActivity(contractor.stats.lastActivity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => setSelectedContractor(
                              selectedContractor === contractor._id ? null : contractor._id
                            )}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {selectedContractor === contractor._id ? 'Hide' : 'View'}
                          </button>
                          <button
                            onClick={() => handleDownloadTimesheet(contractor._id, contractor.name)}
                            className="text-green-600 hover:text-green-900 ml-3"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">How to Use This Dashboard</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>View:</strong> Click "View" to see detailed timesheet information for a contractor</li>
            <li>• <strong>Download:</strong> Click "Download" to get the current month's timesheet as a CSV file</li>
            <li>• <strong>Filter:</strong> Use the dropdown to show only active or inactive contractors</li>
            <li>• <strong>Search:</strong> Use the search box to find specific contractors by name, email, or business</li>
            <li>• <strong>Approvals:</strong> Yellow badges indicate timesheets that need your review and approval</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ContractorManagementDashboard;