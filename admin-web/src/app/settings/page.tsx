'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tenantAPI } from '../../utils/api';

interface TenantSettings {
  name: string;
  businessType: string;
  timezone: string;
  currency: string;
  settings: {
    workHours: {
      standardDaily: number;
      standardWeekly: number;
      overtimeThreshold: number;
      workweekStart: string;
    };
    breaks: {
      requireBreaks: boolean;
      minimumShiftForBreak: number;
      breakDuration: number;
      lunchThreshold: number;
      lunchDuration: number;
    };
    location: {
      enforceGeofencing: boolean;
      allowMobileClocking: boolean;
      requireLocationForClocking: boolean;
    };
    approvals: {
      requireManagerApproval: boolean;
      allowSelfEdit: boolean;
    };
    contractors?: {
      requireProjectAssignment: boolean;
      clientApprovalRequired: boolean;
    };
  };
  contactInfo: {
    primaryContactName: string;
    primaryContactEmail: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

const TenantSettingsPage: React.FC = () => {
  const { currentUser, currentTenant } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  // Check permissions
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">
            Only administrators can access organization settings.
          </p>
        </div>
      </div>
    );
  }

  // Load tenant settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await tenantAPI.getTenantInfo();
        setSettings(response.tenant);
      } catch (err: any) {
        console.error('Failed to load tenant settings:', err);
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      await tenantAPI.updateTenantSettings({
        name: settings.name,
        businessType: settings.businessType,
        timezone: settings.timezone,
        currency: settings.currency,
        settings: settings.settings,
        contactInfo: settings.contactInfo
      });

      setSuccessMessage('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (section: string, key: string, value: any) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      [section]: {
        ...((prev! as any)[section] || {}),
        [key]: value
      }
    }));
  };

  const updateNestedSetting = (section: string, subsection: string, key: string, value: any) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      settings: {
        ...prev!.settings,
        [section]: {
          ...((prev!.settings as any)[section] || {}),
          [key]: value
        }
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error && !settings) {
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

  const tabs = [
    { id: 'general', name: 'General', icon: '🏢' },
    { id: 'work-hours', name: 'Work Hours', icon: '⏰' },
    { id: 'breaks', name: 'Breaks', icon: '☕' },
    { id: 'location', name: 'Location', icon: '📍' },
    { id: 'approvals', name: 'Approvals', icon: '✅' },
    ...(currentTenant?.businessType === 'contractors' ? [
      { id: 'contractors', name: 'Contractors', icon: '👔' }
    ] : []),
    { id: 'contact', name: 'Contact Info', icon: '📞' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
                <p className="text-gray-600">
                  Manage your organization's configuration and preferences
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-3">
            <div className="text-sm text-green-700">{successMessage}</div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* General Tab */}
            {activeTab === 'general' && settings && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                      <input
                        type="text"
                        value={settings.name}
                        onChange={(e) => updateSetting('', 'name', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Business Type</label>
                      <select
                        value={settings.businessType}
                        onChange={(e) => updateSetting('', 'businessType', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="retail">Retail</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="office">Office</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="contractors">Contractors</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => updateSetting('', 'timezone', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="America/Anchorage">Alaska Time</option>
                        <option value="Pacific/Honolulu">Hawaii Time</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Currency</label>
                      <select
                        value={settings.currency}
                        onChange={(e) => updateSetting('', 'currency', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Work Hours Tab */}
            {activeTab === 'work-hours' && settings && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Work Hours Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Standard Daily Hours</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={settings.settings.workHours.standardDaily}
                        onChange={(e) => updateNestedSetting('workHours', '', 'standardDaily', parseInt(e.target.value))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Standard Weekly Hours</label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={settings.settings.workHours.standardWeekly}
                        onChange={(e) => updateNestedSetting('workHours', '', 'standardWeekly', parseInt(e.target.value))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Overtime Threshold (hours)</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={settings.settings.workHours.overtimeThreshold}
                        onChange={(e) => updateNestedSetting('workHours', '', 'overtimeThreshold', parseInt(e.target.value))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Workweek Starts</label>
                      <select
                        value={settings.settings.workHours.workweekStart}
                        onChange={(e) => updateNestedSetting('workHours', '', 'workweekStart', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="sunday">Sunday</option>
                        <option value="monday">Monday</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* More tabs would be implemented similarly... */}
            {activeTab === 'approvals' && settings && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireManagerApproval"
                        checked={settings.settings.approvals.requireManagerApproval}
                        onChange={(e) => updateNestedSetting('approvals', '', 'requireManagerApproval', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="requireManagerApproval" className="ml-2 block text-sm text-gray-900">
                        Require manager approval for time entries
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowSelfEdit"
                        checked={settings.settings.approvals.allowSelfEdit}
                        onChange={(e) => updateNestedSetting('approvals', '', 'allowSelfEdit', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="allowSelfEdit" className="ml-2 block text-sm text-gray-900">
                        Allow employees to edit their own time entries
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Info Tab */}
            {activeTab === 'contact' && settings && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Primary Contact Name</label>
                      <input
                        type="text"
                        value={settings.contactInfo.primaryContactName}
                        onChange={(e) => updateSetting('contactInfo', 'primaryContactName', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Primary Contact Email</label>
                      <input
                        type="email"
                        value={settings.contactInfo.primaryContactEmail}
                        onChange={(e) => updateSetting('contactInfo', 'primaryContactEmail', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        value={settings.contactInfo.phone || ''}
                        onChange={(e) => updateSetting('contactInfo', 'phone', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <input
                        type="text"
                        value={settings.contactInfo.address || ''}
                        onChange={(e) => updateSetting('contactInfo', 'address', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        value={settings.contactInfo.city || ''}
                        onChange={(e) => updateSetting('contactInfo', 'city', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <input
                        type="text"
                        value={settings.contactInfo.state || ''}
                        onChange={(e) => updateSetting('contactInfo', 'state', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantSettingsPage;