'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/utils/api';

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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <div className="text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Contractor Management
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Manage contractors, auto-clocking settings, and approvals
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="oklok-button-primary flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Invite Contractor
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 animate-in">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
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
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="oklok-card animate-in" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <UsersIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Contractors</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="oklok-card animate-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="oklok-card animate-in" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <ClockIcon className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Approval</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>

            <div className="oklok-card animate-in" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <BoltIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Auto-Clocking</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.autoClocking}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="oklok-card animate-in" style={{ animationDelay: '500ms' }}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search contractors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="oklok-input pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="oklok-input"
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

          {/* Tabs */}
          <div className="animate-in" style={{ animationDelay: '600ms' }}>
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'active'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Active Contractors ({filteredContractors.filter(c => c.isActive).length})
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'pending'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pending Approvals ({pendingApprovals.length})
                  {pendingApprovals.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {pendingApprovals.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="animate-in" style={{ animationDelay: '700ms' }}>
            {activeTab === 'active' && (
              <div className="space-y-4">
                {filteredContractors.length === 0 ? (
                  <div className="oklok-card text-center py-12">
                    <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No contractors found</h3>
                    <p className="text-gray-500 mb-6">
                      {contractors.length === 0 ? 'Get started by inviting your first contractor.' : 'Try adjusting your search or filter criteria.'}
                    </p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="oklok-button-primary"
                    >
                      Invite Contractor
                    </button>
                  </div>
                ) : (
                  filteredContractors.map((contractor, index) => (
                    <div key={contractor.id} className="oklok-card animate-in" style={{ animationDelay: `${800 + index * 100}ms` }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold text-sm">
                                {contractor.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{contractor.name}</h3>
                              <p className="text-sm text-gray-500">{contractor.email}</p>
                            </div>
                            <div className="ml-auto sm:ml-4">
                              <span className={`oklok-badge ${StatusConfig[contractor.registrationStatus].color}`}>
                                {renderStatusIcon(contractor.registrationStatus)}
                                {StatusLabels[contractor.registrationStatus]}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">Agency:</span>
                              <span>{contractor.contractingAgency || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TagIcon className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">Department:</span>
                              <span>{contractor.department || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">Manager:</span>
                              <span>{contractor.manager?.name || 'N/A'}</span>
                            </div>
                            {contractor.hourlyRate && (
                              <div className="flex items-center gap-2">
                                <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">Rate:</span>
                                <span>${contractor.hourlyRate}/hr</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          {contractor.autoClockingEnabled && contractor.processingMode && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-gray-700">Auto-Clocking:</span><br />
                              <span className="text-xs">{AutoClockingModeLabels[contractor.processingMode]}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">Auto-Clock:</span>
                              <button
                                onClick={() => toggleAutoClocking(contractor.id, !contractor.autoClockingEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  contractor.autoClockingEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
              <div className="space-y-4">
                {pendingApprovals.length === 0 ? (
                  <div className="oklok-card text-center py-12">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pending approvals</h3>
                    <p className="text-gray-500">All contractor setups have been processed.</p>
                  </div>
                ) : (
                  pendingApprovals.map((contractor, index) => (
                    <div key={contractor.id} className="oklok-card animate-in" style={{ animationDelay: `${800 + index * 100}ms` }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center">
                              <span className="text-amber-600 font-semibold text-sm">
                                {contractor.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{contractor.name}</h3>
                              <p className="text-sm text-gray-500">{contractor.email}</p>
                              <p className="text-xs text-gray-400">
                                Setup completed: {new Date(contractor.setupCompletedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">Agency:</span>
                              <span>{contractor.contractingAgency || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CogIcon className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">Auto-Clocking:</span>
                              <span>
                                {contractor.autoClockingSettings?.processingMode ? 
                                  AutoClockingModeLabels[contractor.autoClockingSettings.processingMode as keyof typeof AutoClockingModeLabels] || 'N/A' : 'N/A'}
                              </span>
                            </div>
                            {contractor.hourlyRate && (
                              <div className="flex items-center gap-2">
                                <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">Rate:</span>
                                <span>${contractor.hourlyRate}/hr</span>
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
                            className="oklok-button-danger text-sm px-4 py-2"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveContractor(contractor.id, true)}
                            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 text-sm"
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
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

          {/* Invite Contractor Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
              <div className="relative oklok-card max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in">
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
                      className="oklok-input"
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
                      className="oklok-input"
                      placeholder="contractor@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contracting Agency</label>
                    <input
                      type="text"
                      value={inviteForm.contractingAgency}
                      onChange={(e) => setInviteForm({ ...inviteForm, contractingAgency: e.target.value })}
                      className="oklok-input"
                      placeholder="e.g., Tech Solutions Inc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <input
                      type="text"
                      value={inviteForm.department}
                      onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                      className="oklok-input"
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
                      className="oklok-input"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="oklok-button-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="oklok-button-primary disabled:opacity-50"
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