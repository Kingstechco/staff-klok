'use client';

import { useState, useEffect } from 'react';
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

const StatusColors = {
  invited: 'text-yellow-600 bg-yellow-100',
  setup_pending: 'text-blue-600 bg-blue-100',
  setup_completed: 'text-orange-600 bg-orange-100',
  active: 'text-green-600 bg-green-100',
  inactive: 'text-gray-600 bg-gray-100'
};

export default function ContractorsPage() {
  const { currentUser } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [showInviteForm, setShowInviteForm] = useState(false);
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
          'Content-Type': 'application/json'
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
          'Content-Type': 'application/json'
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...inviteForm,
          hourlyRate: inviteForm.hourlyRate ? parseFloat(inviteForm.hourlyRate) : undefined
        })
      });

      if (response.ok) {
        alert('Contractor invited successfully! Setup link sent via email.');
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
        setShowInviteForm(false);
        fetchContractors();
      } else {
        const error = await response.json();
        alert('Failed to invite contractor: ' + error.error);
      }
    } catch (err) {
      alert('Failed to invite contractor');
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approved,
          rejectionReason: rejectionReason || undefined
        })
      });

      if (response.ok) {
        alert(approved ? 'Contractor approved successfully!' : 'Contractor registration rejected.');
        fetchContractors();
        fetchPendingApprovals();
      } else {
        const error = await response.json();
        alert('Failed to process approval: ' + error.error);
      }
    } catch (err) {
      alert('Failed to process approval');
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        fetchContractors();
      } else {
        alert('Failed to update auto-clocking setting');
      }
    } catch (err) {
      alert('Failed to update auto-clocking setting');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contractor Management</h1>
          <p className="text-gray-600">Manage contractors, auto-clocking settings, and approvals</p>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Invite Contractor
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">{contractors.length}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Contractors</p>
              <p className="text-lg font-semibold text-gray-900">{contractors.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold">
                  {contractors.filter(c => c.isActive).length}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-lg font-semibold text-gray-900">
                {contractors.filter(c => c.isActive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-semibold">{pendingApprovals.length}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Approval</p>
              <p className="text-lg font-semibold text-gray-900">{pendingApprovals.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-semibold">
                  {contractors.filter(c => c.autoClockingEnabled).length}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Auto-Clocking Enabled</p>
              <p className="text-lg font-semibold text-gray-900">
                {contractors.filter(c => c.autoClockingEnabled).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Active Contractors ({contractors.filter(c => c.isActive).length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Approvals ({pendingApprovals.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'active' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {contractors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No contractors found</p>
              <button
                onClick={() => setShowInviteForm(true)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Invite Your First Contractor
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {contractors.map((contractor) => (
                <li key={contractor.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{contractor.name}</p>
                          <p className="text-sm text-gray-500">{contractor.email}</p>
                        </div>
                        <div className="ml-6">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            StatusColors[contractor.registrationStatus]
                          }`}>
                            {StatusLabels[contractor.registrationStatus]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {contractor.autoClockingEnabled && contractor.processingMode && (
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Auto-Clocking:</span>{' '}
                            {AutoClockingModeLabels[contractor.processingMode]}
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Auto-Clock:</span>
                          <button
                            onClick={() => toggleAutoClocking(contractor.id, !contractor.autoClockingEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                              contractor.autoClockingEnabled ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                contractor.autoClockingEnabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Agency:</span>{' '}
                        {contractor.contractingAgency || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Department:</span>{' '}
                        {contractor.department || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Manager:</span>{' '}
                        {contractor.manager?.name || 'N/A'}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No pending approvals</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {pendingApprovals.map((contractor) => (
                <li key={contractor.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{contractor.name}</p>
                        <p className="text-sm text-gray-500">{contractor.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Setup completed: {new Date(contractor.setupCompletedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const reason = prompt('Rejection reason (optional):');
                            if (reason !== null) {
                              handleApproveContractor(contractor.id, false, reason);
                            }
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveContractor(contractor.id, true)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Agency:</span>{' '}
                        {contractor.contractingAgency || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Auto-Clocking Mode:</span>{' '}
                        {contractor.autoClockingSettings?.processingMode ? 
                          AutoClockingModeLabels[contractor.autoClockingSettings.processingMode as keyof typeof AutoClockingModeLabels] || 'N/A' : 'N/A'}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Invite Contractor Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Contractor</h3>
              <form onSubmit={handleInviteContractor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contracting Agency</label>
                  <input
                    type="text"
                    value={inviteForm.contractingAgency}
                    onChange={(e) => setInviteForm({ ...inviteForm, contractingAgency: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <input
                    type="text"
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Hourly Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={inviteForm.hourlyRate}
                    onChange={(e) => setInviteForm({ ...inviteForm, hourlyRate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}