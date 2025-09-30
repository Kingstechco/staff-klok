'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/utils/api';
import TimeDisplay from '@/components/ui/TimeDisplay';

interface Contractor {
  id: string;
  name: string;
  email: string;
  department?: string;
  contractingAgency?: string;
  registrationStatus: 'invited' | 'setup_pending' | 'setup_completed' | 'active' | 'inactive';
  autoClockingEnabled?: boolean;
  processingMode?: 'proactive' | 'reactive' | 'weekly_batch';
  manager?: { name: string; email: string };
  isActive: boolean;
  lastLogin?: string;
  setupCompletedAt?: string;
  hourlyRate?: number;
}

interface PendingContractor {
  id: string;
  name: string;
  email: string;
  department?: string;
  contractingAgency?: string;
  manager?: { name: string; email: string };
  setupCompletedAt: string;
  autoClockingSettings: any;
  createdBy?: { name: string; email: string };
  hourlyRate?: number;
}

const AutoClockingModeLabels = {
  proactive: 'Start of Day Auto-Clock',
  reactive: 'End of Day Auto-Fill',
  weekly_batch: 'Weekly Timesheet Generation'
};

const StatusLabels = {
  invited: 'Invited',
  setup_pending: 'Setup Pending',
  setup_completed: 'Awaiting Approval',
  active: 'Active',
  inactive: 'Inactive'
};

const StatusConfig = {
  invited: { color: 'oklok-badge-warning', icon: MailIcon },
  setup_pending: { color: 'oklok-badge-info', icon: ClockIcon },
  setup_completed: { color: 'bg-orange-100 text-orange-700', icon: ExclamationTriangleIcon },
  active: { color: 'oklok-badge-success', icon: CheckCircleIcon },
  inactive: { color: 'bg-gray-100 text-gray-700', icon: XCircleIcon }
};

// Helper function to render status icon
const renderStatusIcon = (status: string, className: string = "h-3 w-3 mr-1") => {
  const IconComponent = StatusConfig[status as keyof typeof StatusConfig]?.icon;
  return IconComponent ? <IconComponent className={className} /> : null;
};

export default function ContractorsPage() {
  const { currentUser } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    contractingAgency: '',
    department: '',
    hourlyRate: '',
    defaultSchedule: {
      startTime: '09:00',
      endTime: '17:00',
      hoursPerDay: 8,
      workDays: [1, 2, 3, 4, 5] // Mon-Fri
    }
  });

  useEffect(() => {
    if (currentUser) {
      fetchContractors();
      fetchPendingApprovals();
    }
  }, [currentUser]);

  const fetchContractors = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contractor/contractors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'test'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContractors(data.contractors || []);
      } else {
        throw new Error('Failed to fetch contractors');
      }
    } catch (err) {
      setError('Failed to fetch contractors');
      console.error(err);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contractor/pending-approvals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'test'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(data.contractors || []);
      } else {
        console.error('Failed to fetch pending approvals');
      }
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contractor/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'test'
        },
        body: JSON.stringify({
          ...inviteForm,
          hourlyRate: inviteForm.hourlyRate ? parseFloat(inviteForm.hourlyRate) : undefined
        })
      });

      if (response.ok) {
        setInviteForm({
          name: '',
          email: '',
          contractingAgency: '',
          department: '',
          hourlyRate: '',
          defaultSchedule: {
            startTime: '09:00',
            endTime: '17:00',
            hoursPerDay: 8,
            workDays: [1, 2, 3, 4, 5]
          }
        });
        setShowInviteModal(false);
        fetchContractors();
        setError(null);
      } else {
        const errorData = await response.json();
        setError('Failed to invite contractor: ' + errorData.error);
      }
    } catch (err) {
      setError('Failed to invite contractor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveContractor = async (contractorId: string, approved: boolean, rejectionReason?: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contractor/${contractorId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'test'
        },
        body: JSON.stringify({
          approved,
          rejectionReason: rejectionReason || undefined
        })
      });

      if (response.ok) {
        fetchContractors();
        fetchPendingApprovals();
        setError(null);
      } else {
        const errorData = await response.json();
        setError('Failed to process approval: ' + errorData.error);
      }
    } catch (err) {
      setError('Failed to process approval');
      console.error(err);
    }
  };

  const toggleAutoClocking = async (contractorId: string, enabled: boolean) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contractor/${contractorId}/auto-clock/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'test'
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        fetchContractors();
        setError(null);
      } else {
        setError('Failed to update auto-clocking setting');
      }
    } catch (err) {
      setError('Failed to update auto-clocking setting');
      console.error(err);
    }
  };

  // Filter and search contractors
  const filteredContractors = useMemo(() => {
    return contractors.filter(contractor => {
      const matchesSearch = contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contractor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contractor.contractingAgency?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' || contractor.registrationStatus === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  }, [contractors, searchTerm, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = contractors.length;
    const active = contractors.filter(c => c.isActive).length;
    const pending = pendingApprovals.length;
    const autoClocking = contractors.filter(c => c.autoClockingEnabled).length;
    
    return { total, active, pending, autoClocking };
  }, [contractors, pendingApprovals]);

  if (loading && contractors.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Header */}
      <div className="relative border-b border-gray-200/60 bg-gradient-to-r from-white via-white to-indigo-50/30 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 via-transparent to-purple-50/10 opacity-50" />
        
        {/* Floating Decorative Elements */}
        <div className="absolute top-4 right-8 opacity-20">
          <div className="flex space-x-2">
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse" style={{ animationDelay: '800ms' }} />
          </div>
        </div>
        
        <div className="relative px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Title Section */}
            <div className="flex-1">
              <h1 className="text-2xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-indigo-700 bg-clip-text text-transparent">
                Contractor Management
              </h1>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                Manage contractors, auto-clocking settings, and approvals
              </p>
            </div>
            
            {/* Actions and Time Display */}
            <div className="flex items-center gap-4">
              <div className="flex gap-3">
                {/* Enhanced Invite Button */}
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 border-2 border-white/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <PlusIcon className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Invite Contractor
                </button>
              </div>
              
              <TimeDisplay />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-white to-indigo-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-indigo-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <UsersIcon className="h-6 w-6 text-indigo-600 group-hover:animate-pulse" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Total Contractors</p>
                <p className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover:from-indigo-700 group-hover:to-purple-700 transition-all duration-300">{stats.total}</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">All contractors</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>

          <div className="group relative bg-gradient-to-br from-white to-green-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-green-300 hover:shadow-2xl hover:shadow-green-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-green-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <CheckCircleIcon className="h-6 w-6 text-green-600 group-hover:animate-bounce" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Active</p>
                <p className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover:from-green-700 group-hover:to-emerald-700 transition-all duration-300">{stats.active}</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Currently working</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>

          <div className="group relative bg-gradient-to-br from-white to-amber-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-amber-300 hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-amber-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <ClockIcon className="h-6 w-6 text-amber-600 group-hover:animate-pulse" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Pending Approval</p>
                <p className="text-3xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent group-hover:from-amber-700 group-hover:to-orange-700 transition-all duration-300">{stats.pending}</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Need review</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>

          <div className="group relative bg-gradient-to-br from-white to-purple-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-purple-300 hover:shadow-2xl hover:shadow-purple-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-purple-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <BoltIcon className="h-6 w-6 text-purple-600 group-hover:animate-bounce" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Auto-Clocking</p>
                <p className="text-3xl font-black bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:to-violet-700 transition-all duration-300">{stats.autoClocking}</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Enabled</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>
        </div>

        {/* Enhanced Search and Filter */}
        <div className="group relative bg-gradient-to-br from-white via-white to-gray-50/30 border border-gray-200/60 rounded-2xl p-6 mb-8 hover:shadow-xl hover:shadow-gray-500/10 transition-all duration-300 overflow-hidden backdrop-blur-sm">
          {/* Enhanced Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Floating Decorative Elements */}
          <div className="absolute top-4 right-4 opacity-20">
            <div className="flex space-x-1">
              <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" />
              <div className="h-1 w-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse" style={{ animationDelay: '500ms' }} />
            </div>
          </div>
          
          <div className="relative flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative group/search">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover/search:text-indigo-600 transition-colors duration-300" />
                <input
                  type="text"
                  placeholder="Search contractors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 pr-4 py-3 w-full border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-medium transition-all duration-300 hover:shadow-md"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover/search:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-bold text-gray-700 cursor-pointer hover:shadow-md transition-all duration-300"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="setup_pending">Setup Pending</option>
                <option value="setup_completed">Awaiting Approval</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="group relative bg-gradient-to-br from-white via-white to-gray-50/30 border border-gray-200/60 rounded-2xl p-6 hover:shadow-xl hover:shadow-gray-500/10 transition-all duration-300 overflow-hidden backdrop-blur-sm">
          {/* Enhanced Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/20 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative border-b border-gray-200/60">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('active')}
                className={`py-3 px-1 border-b-2 font-bold text-sm transition-all duration-300 ${
                  activeTab === 'active'
                    ? 'border-indigo-500 text-indigo-600 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-indigo-50/30 rounded-t-lg'
                }`}
              >
                Active Contractors ({filteredContractors.filter(c => c.isActive).length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-3 px-1 border-b-2 font-bold text-sm transition-all duration-300 ${
                  activeTab === 'pending'
                    ? 'border-indigo-500 text-indigo-600 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-indigo-50/30 rounded-t-lg'
                }`}
              >
                Pending Approvals ({pendingApprovals.length})
                {pendingApprovals.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 shadow-sm border border-amber-200/60">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="mt-6">
            {activeTab === 'active' && (
              <div className="space-y-6">
                {filteredContractors.length === 0 ? (
                  <div className="relative text-center py-16 px-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/30 via-purple-50/20 to-indigo-50/30 opacity-50 rounded-2xl" />
                    <div className="relative">
                      <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 shadow-lg mb-4">
                        <UsersIcon className="h-12 w-12 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-3">No contractors found</h3>
                      <p className="text-sm font-medium text-gray-600 mb-8 max-w-md mx-auto">
                        {contractors.length === 0 
                          ? 'Get started by inviting your first contractor to begin building your team.' 
                          : 'Try adjusting your search or filter criteria to find what you\'re looking for.'}
                      </p>
                      {contractors.length === 0 && (
                        <div className="mt-8">
                          <button
                            onClick={() => setShowInviteModal(true)}
                            className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 border-2 border-white/20"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <PlusIcon className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                            <span className="relative">Invite Your First Contractor</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  filteredContractors.map((contractor, index) => (
                    <div 
                      key={contractor.id} 
                      className="group relative border border-gray-200/60 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50/30 overflow-hidden"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Enhanced Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/20 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Floating Accent */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-40 transition-opacity duration-300">
                        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" />
                      </div>
                      
                      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="relative">
                              <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                                <span>
                                  {contractor.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              {/* Status indicator for active contractors */}
                              {contractor.isActive && (
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-700 transition-colors duration-300">{contractor.name}</h3>
                              <p className="text-sm font-medium text-gray-500 group-hover:text-gray-600 transition-colors duration-300">{contractor.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm border transition-all duration-300 ${StatusConfig[contractor.registrationStatus].color}`}>
                                  {renderStatusIcon(contractor.registrationStatus)}
                                  {StatusLabels[contractor.registrationStatus]}
                                </span>
                                {contractor.lastLogin && (
                                  <span className="text-xs font-medium text-gray-400">
                                    Last seen: {new Date(contractor.lastLogin).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300">
                              <BuildingOfficeIcon className="h-4 w-4 text-indigo-500" />
                              <span className="font-bold">Agency:</span>
                              <span className="font-medium">{contractor.contractingAgency || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300">
                              <TagIcon className="h-4 w-4 text-purple-500" />
                              <span className="font-bold">Department:</span>
                              <span className="font-medium">{contractor.department || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300">
                              <UserIcon className="h-4 w-4 text-blue-500" />
                              <span className="font-bold">Manager:</span>
                              <span className="font-medium">{contractor.manager?.name || 'N/A'}</span>
                            </div>
                            {contractor.hourlyRate && (
                              <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/30 transition-all duration-300">
                                <CurrencyDollarIcon className="h-4 w-4 text-green-500" />
                                <span className="font-bold">Rate:</span>
                                <span className="font-medium text-green-700">${contractor.hourlyRate}/hr</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mt-6 pt-6 border-t border-gray-200/40">
                          {contractor.autoClockingEnabled && contractor.processingMode && (
                            <div className="group/mode relative text-sm p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/60 rounded-xl hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 flex-1 min-w-0">
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover/mode:opacity-100 transition-opacity duration-300" />
                              <div className="relative flex items-start gap-2">
                                <CogIcon className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="font-bold text-indigo-700 block">Auto-Clocking Mode</span>
                                  <span className="text-xs font-medium text-indigo-600 mt-1 block">{AutoClockingModeLabels[contractor.processingMode]}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4">
                            <div className="group/toggle flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-indigo-50/50 border border-gray-200/60 rounded-xl hover:shadow-lg hover:shadow-gray-500/10 transition-all duration-300">
                              <div className="flex items-center gap-2">
                                <BoltIcon className="h-4 w-4 text-gray-600 group-hover/toggle:text-indigo-600 transition-colors duration-300" />
                                <span className="text-sm font-bold text-gray-700 group-hover/toggle:text-indigo-700 transition-colors duration-300">Auto-Clock</span>
                              </div>
                              <button
                                onClick={() => toggleAutoClocking(contractor.id, !contractor.autoClockingEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                                  contractor.autoClockingEnabled ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gradient-to-r from-gray-300 to-gray-400'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 shadow-lg ${
                                    contractor.autoClockingEnabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'pending' && (
              <div className="space-y-6">
                {pendingApprovals.length === 0 ? (
                  <div className="relative text-center py-16 px-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-50/30 via-emerald-50/20 to-green-50/30 opacity-50 rounded-2xl" />
                    <div className="relative">
                      <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 shadow-lg mb-4">
                        <CheckCircleIcon className="h-12 w-12 text-green-600" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-3">All caught up!</h3>
                      <p className="text-sm font-medium text-gray-600 max-w-md mx-auto">
                        No pending contractor approvals. All setups have been processed and reviewed.
                      </p>
                    </div>
                  </div>
                ) : (
                  pendingApprovals.map((contractor, index) => (
                    <div key={contractor.id} className="group relative border border-gray-200/60 rounded-2xl p-6 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-amber-50/20 overflow-hidden">
                      {/* Enhanced Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-50/20 via-transparent to-orange-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                              <span>
                                {contractor.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-gray-900 group-hover:text-amber-700 transition-colors duration-300">{contractor.name}</h3>
                              <p className="text-sm font-medium text-gray-500 group-hover:text-gray-600 transition-colors duration-300">{contractor.email}</p>
                              <p className="text-xs font-semibold text-amber-600">
                                Setup completed: {new Date(contractor.setupCompletedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/30 transition-all duration-300">
                              <BuildingOfficeIcon className="h-4 w-4 text-amber-500" />
                              <span className="font-bold">Agency:</span>
                              <span className="font-medium">{contractor.contractingAgency || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/30 transition-all duration-300">
                              <CogIcon className="h-4 w-4 text-orange-500" />
                              <span className="font-bold">Auto-Clocking:</span>
                              <span className="font-medium">
                                {contractor.autoClockingSettings?.processingMode ? 
                                  AutoClockingModeLabels[contractor.autoClockingSettings.processingMode as keyof typeof AutoClockingModeLabels] || 'N/A' : 'N/A'}
                              </span>
                            </div>
                            {contractor.hourlyRate && (
                              <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/30 transition-all duration-300">
                                <CurrencyDollarIcon className="h-4 w-4 text-green-500" />
                                <span className="font-bold">Rate:</span>
                                <span className="font-medium text-green-700">${contractor.hourlyRate}/hr</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const reason = prompt('Rejection reason (optional):');
                              if (reason !== null) {
                                handleApproveContractor(contractor.id, false, reason);
                              }
                            }}
                            className="group relative inline-flex items-center px-5 py-2.5 border border-red-300/60 rounded-xl text-sm font-bold text-red-700 bg-gradient-to-r from-white to-red-50 hover:from-red-50 hover:to-red-100 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10 hover:-translate-y-0.5"
                          >
                            <XMarkIcon className="h-4 w-4 mr-2 group-hover:animate-bounce" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveContractor(contractor.id, true)}
                            className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:shadow-green-500/25 hover:scale-105 border-2 border-white/20"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <CheckIcon className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Invite Contractor Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white border border-gray-200 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Invite Contractor</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleInviteContractor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter contractor's full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="contractor@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contracting Agency</label>
                  <input
                    type="text"
                    value={inviteForm.contractingAgency}
                    onChange={(e) => setInviteForm({ ...inviteForm, contractingAgency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Tech Solutions Inc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., IT, Marketing, Operations"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={inviteForm.hourlyRate}
                    onChange={(e) => setInviteForm({ ...inviteForm, hourlyRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Icon Components
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.16 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function BuildingOfficeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 21h16.5M4.5 3h15l-.75 18h-13.5L4.5 3z" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function CurrencyDollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function PaperAirplaneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}