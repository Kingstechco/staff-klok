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

    if (currentUser && currentUser.role === 'admin') {
      loadSettings();
    }
  }, [currentUser]);

  // Check permissions
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="oklok-card text-center max-w-md">
          <div className="oklok-error-state">
            <div className="oklok-error-icon">
              <ExclamationTriangleIcon />
            </div>
            <h2 className="oklok-error-title">Access Denied</h2>
            <p className="oklok-error-description">
              Only administrators can access organization settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="oklok-card text-center">
          <div className="oklok-spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="oklok-card text-center max-w-md">
          <div className="oklok-error-state">
            <div className="oklok-error-icon">
              <ExclamationTriangleIcon />
            </div>
            <h2 className="oklok-error-title">Failed to Load Settings</h2>
            <p className="oklok-error-description">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="oklok-button-primary mt-4"
              aria-label="Retry loading organization settings"
            >
              Retry
            </button>
          </div>
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="oklok-header border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-balance">
                  Organization Settings
                </h1>
                <p className="mt-2 text-gray-600 text-pretty max-w-3xl">
                  Manage your organization&apos;s configuration and preferences to customize how your team tracks time and manages work schedules.
                </p>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="oklok-button-primary min-w-[140px]"
                  aria-label={saving ? 'Saving settings, please wait' : 'Save all changes to organization settings'}
                >
                  {saving ? (
                    <span className="flex items-center justify-center">
                      <div className="oklok-spinner-white mr-2" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 oklok-error-state oklok-card border-l-4 border-red-500">
            <div className="oklok-error-icon">
              <ExclamationTriangleIcon />
            </div>
            <div className="oklok-error-description">{error}</div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 oklok-card border-l-4 border-emerald-500 bg-emerald-50/50">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-3" />
              <div className="text-sm text-emerald-700 font-medium">{successMessage}</div>
            </div>
          </div>
        )}

        <div className="oklok-card">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap gap-x-6 gap-y-2 px-6 py-2" aria-label="Settings navigation">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors min-h-[44px] flex items-center ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  aria-label={`Configure ${tab.name.toLowerCase()} settings`}
                >
                  <span className="mr-2 text-base" aria-hidden="true">{tab.icon}</span>
                  <span className="whitespace-nowrap">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 lg:p-8">
            {/* General Tab */}
            {activeTab === 'general' && settings && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Organization Details</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="oklok-form-group">
                      <label htmlFor="org-name" className="oklok-label oklok-label-required">
                        Organization Name
                      </label>
                      <input
                        id="org-name"
                        type="text"
                        value={settings.name}
                        onChange={(e) => updateSetting('', 'name', e.target.value)}
                        className="oklok-input"
                        placeholder="Enter your organization name"
                        required
                        aria-describedby="org-name-help"
                      />
                      <div id="org-name-help" className="oklok-form-help">
                        This will be displayed throughout the application
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="business-type" className="oklok-label oklok-label-required">
                        Business Type
                      </label>
                      <select
                        id="business-type"
                        value={settings.businessType}
                        onChange={(e) => updateSetting('', 'businessType', e.target.value)}
                        className="oklok-input"
                        required
                        aria-describedby="business-type-help"
                      >
                        <option value="retail">Retail</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="office">Office</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="contractors">Contractors</option>
                      </select>
                      <div id="business-type-help" className="oklok-form-help">
                        Select the type that best describes your business
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="timezone" className="oklok-label oklok-label-required">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        value={settings.timezone}
                        onChange={(e) => updateSetting('', 'timezone', e.target.value)}
                        className="oklok-input"
                        required
                        aria-describedby="timezone-help"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                      </select>
                      <div id="timezone-help" className="oklok-form-help">
                        Used for time calculations and reporting
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="currency" className="oklok-label oklok-label-required">
                        Currency
                      </label>
                      <select
                        id="currency"
                        value={settings.currency}
                        onChange={(e) => updateSetting('', 'currency', e.target.value)}
                        className="oklok-input"
                        required
                        aria-describedby="currency-help"
                      >
                        <option value="USD">USD ($) - US Dollar</option>
                        <option value="CAD">CAD ($) - Canadian Dollar</option>
                        <option value="EUR">EUR (€) - Euro</option>
                        <option value="GBP">GBP (£) - British Pound</option>
                      </select>
                      <div id="currency-help" className="oklok-form-help">
                        Default currency for payroll and reporting
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Work Hours Tab */}
            {activeTab === 'work-hours' && settings && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Work Hours Configuration</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="oklok-form-group">
                      <label htmlFor="daily-hours" className="oklok-label oklok-label-required">
                        Standard Daily Hours
                      </label>
                      <input
                        id="daily-hours"
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        value={settings.settings.workHours.standardDaily}
                        onChange={(e) => updateNestedSetting('workHours', '', 'standardDaily', parseFloat(e.target.value))}
                        className="oklok-input"
                        required
                        aria-describedby="daily-hours-help"
                      />
                      <div id="daily-hours-help" className="oklok-form-help">
                        Expected hours per work day (1-24)
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="weekly-hours" className="oklok-label oklok-label-required">
                        Standard Weekly Hours
                      </label>
                      <input
                        id="weekly-hours"
                        type="number"
                        min="1"
                        max="168"
                        step="0.5"
                        value={settings.settings.workHours.standardWeekly}
                        onChange={(e) => updateNestedSetting('workHours', '', 'standardWeekly', parseFloat(e.target.value))}
                        className="oklok-input"
                        required
                        aria-describedby="weekly-hours-help"
                      />
                      <div id="weekly-hours-help" className="oklok-form-help">
                        Expected hours per work week (1-168)
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="overtime-threshold" className="oklok-label oklok-label-required">
                        Overtime Threshold
                      </label>
                      <input
                        id="overtime-threshold"
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        value={settings.settings.workHours.overtimeThreshold}
                        onChange={(e) => updateNestedSetting('workHours', '', 'overtimeThreshold', parseFloat(e.target.value))}
                        className="oklok-input"
                        required
                        aria-describedby="overtime-threshold-help"
                      />
                      <div id="overtime-threshold-help" className="oklok-form-help">
                        Daily hours after which overtime applies
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="workweek-start" className="oklok-label oklok-label-required">
                        Workweek Starts On
                      </label>
                      <select
                        id="workweek-start"
                        value={settings.settings.workHours.workweekStart}
                        onChange={(e) => updateNestedSetting('workHours', '', 'workweekStart', e.target.value)}
                        className="oklok-input"
                        required
                        aria-describedby="workweek-start-help"
                      >
                        <option value="sunday">Sunday</option>
                        <option value="monday">Monday</option>
                      </select>
                      <div id="workweek-start-help" className="oklok-form-help">
                        First day of your workweek for calculations
                      </div>
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
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="oklok-form-group">
                      <label htmlFor="contact-name" className="oklok-label oklok-label-required">
                        Primary Contact Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={settings.contactInfo.primaryContactName}
                        onChange={(e) => updateSetting('contactInfo', 'primaryContactName', e.target.value)}
                        className="oklok-input"
                        placeholder="Enter primary contact name"
                        required
                        aria-describedby="contact-name-help"
                      />
                      <div id="contact-name-help" className="oklok-form-help">
                        Main contact person for your organization
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="contact-email" className="oklok-label oklok-label-required">
                        Primary Contact Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={settings.contactInfo.primaryContactEmail}
                        onChange={(e) => updateSetting('contactInfo', 'primaryContactEmail', e.target.value)}
                        className="oklok-input"
                        placeholder="contact@company.com"
                        required
                        aria-describedby="contact-email-help"
                      />
                      <div id="contact-email-help" className="oklok-form-help">
                        Email for system notifications and support
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="contact-phone" className="oklok-label">
                        Phone Number
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        value={settings.contactInfo.phone || ''}
                        onChange={(e) => updateSetting('contactInfo', 'phone', e.target.value)}
                        className="oklok-input"
                        placeholder="+1 (555) 123-4567"
                        aria-describedby="contact-phone-help"
                      />
                      <div id="contact-phone-help" className="oklok-form-help">
                        Optional business phone number
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="contact-address" className="oklok-label">
                        Business Address
                      </label>
                      <input
                        id="contact-address"
                        type="text"
                        value={settings.contactInfo.address || ''}
                        onChange={(e) => updateSetting('contactInfo', 'address', e.target.value)}
                        className="oklok-input"
                        placeholder="123 Business St"
                        aria-describedby="contact-address-help"
                      />
                      <div id="contact-address-help" className="oklok-form-help">
                        Street address for your main location
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="contact-city" className="oklok-label">
                        City
                      </label>
                      <input
                        id="contact-city"
                        type="text"
                        value={settings.contactInfo.city || ''}
                        onChange={(e) => updateSetting('contactInfo', 'city', e.target.value)}
                        className="oklok-input"
                        placeholder="City name"
                        aria-describedby="contact-city-help"
                      />
                      <div id="contact-city-help" className="oklok-form-help">
                        City where your business is located
                      </div>
                    </div>

                    <div className="oklok-form-group">
                      <label htmlFor="contact-state" className="oklok-label">
                        State/Province
                      </label>
                      <input
                        id="contact-state"
                        type="text"
                        value={settings.contactInfo.state || ''}
                        onChange={(e) => updateSetting('contactInfo', 'state', e.target.value)}
                        className="oklok-input"
                        placeholder="State or Province"
                        aria-describedby="contact-state-help"
                      />
                      <div id="contact-state-help" className="oklok-form-help">
                        State, province, or region
                      </div>
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

// Icon Components
function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

export default TenantSettingsPage;