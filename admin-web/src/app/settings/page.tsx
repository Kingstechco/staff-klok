'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tenantAPI } from '../../utils/api';
import TimeDisplay from '@/components/ui/TimeDisplay';

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
        <div className="bg-white border border-gray-200 rounded-xl text-center p-8">
          <div className="mb-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
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
        <div className="bg-white border border-gray-200 rounded-xl text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl text-center p-8">
          <div className="mb-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Settings</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
    { id: 'general', name: 'General', icon: BuildingOfficeIcon },
    { id: 'work-hours', name: 'Work Hours', icon: ClockIcon },
    { id: 'breaks', name: 'Breaks', icon: PauseIcon },
    { id: 'location', name: 'Location', icon: MapPinIcon },
    { id: 'approvals', name: 'Approvals', icon: CheckBadgeIcon },
    ...(currentTenant?.businessType === 'contractors' ? [
      { id: 'contractors', name: 'Contractors', icon: UserGroupIcon }
    ] : []),
    { id: 'contact', name: 'Contact Info', icon: PhoneIcon }
  ];

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
                Organization Settings
              </h1>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                Manage your organization's configuration and preferences
              </p>
            </div>
            
            {/* Actions and Time Display */}
            <div className="flex items-center gap-4">
              <div className="flex gap-3">
                {/* Enhanced Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 border-2 border-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  aria-label={saving ? 'Saving settings, please wait' : 'Save all changes to organization settings'}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {saving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
              
              <TimeDisplay collapsible />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-white to-indigo-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-indigo-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <BuildingOfficeIcon className="h-6 w-6 text-indigo-600 group-hover:animate-pulse" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Organization</p>
                <p className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover:from-indigo-700 group-hover:to-purple-700 transition-all duration-300">{settings?.name || 'Loading...'}</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">{settings?.businessType || 'Type'}</p>
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
                <ClockIcon className="h-6 w-6 text-green-600 group-hover:animate-bounce" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Work Week</p>
                <p className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover:from-green-700 group-hover:to-emerald-700 transition-all duration-300">{settings?.settings.workHours.standardWeekly || 40}h</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Standard hours</p>
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
                <MapPinIcon className="h-6 w-6 text-amber-600 group-hover:animate-pulse" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Timezone</p>
                <p className="text-lg font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent group-hover:from-amber-700 group-hover:to-orange-700 transition-all duration-300">{settings?.timezone?.split('/')[1]?.replace('_', ' ') || 'Not Set'}</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Local time zone</p>
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
                <CurrencyDollarIcon className="h-6 w-6 text-purple-600 group-hover:animate-bounce" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Currency</p>
                <p className="text-3xl font-black bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:to-violet-700 transition-all duration-300">{settings?.currency || 'USD'}</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Default currency</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>
        </div>

        {/* Enhanced Status Messages */}
        {error && (
          <div className="mb-6 relative bg-gradient-to-br from-red-50 to-red-50/80 border border-red-200/60 rounded-2xl p-4 border-l-4 border-l-red-500 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3" />
              <div className="text-sm text-red-700 font-medium">{error}</div>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 relative bg-gradient-to-br from-emerald-50 to-emerald-50/80 border border-emerald-200/60 rounded-2xl p-4 border-l-4 border-l-emerald-500 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-3" />
              <div className="text-sm text-emerald-700 font-medium">{successMessage}</div>
            </div>
          </div>
        )}

        <div className="group relative bg-gradient-to-br from-white to-gray-50/20 border border-gray-200/60 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-gray-500/10 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/10 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative border-b border-gray-200/60 bg-gradient-to-r from-gray-50/50 to-indigo-50/30">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/20 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <nav className="relative flex flex-wrap gap-x-1 px-6 py-4" aria-label="Settings navigation">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 min-h-[44px] hover:scale-105 hover:shadow-lg ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg border-2 border-white/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50/50 border border-transparent hover:border-indigo-200/60'
                    }`}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    aria-label={`Configure ${tab.name.toLowerCase()} settings`}
                  >
                    {activeTab === tab.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                    <IconComponent className={`h-4 w-4 transition-all duration-300 ${activeTab === tab.id ? 'text-white group-hover:animate-pulse' : 'group-hover:text-indigo-600'}`} aria-hidden="true" />
                    <span className="relative whitespace-nowrap">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6 lg:p-8">
            {/* General Tab */}
            {activeTab === 'general' && settings && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                    Organization Details
                    <div className="h-1 w-20 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="group relative space-y-2">
                      <label htmlFor="org-name" className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                        Organization Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="org-name"
                          type="text"
                          value={settings.name}
                          onChange={(e) => updateSetting('', 'name', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-medium transition-all duration-300 hover:shadow-md"
                          placeholder="Enter your organization name"
                          required
                          aria-describedby="org-name-help"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                      <div id="org-name-help" className="text-xs font-medium text-gray-500">
                        This will be displayed throughout the application
                      </div>
                    </div>

                    <div className="group relative space-y-2">
                      <label htmlFor="business-type" className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                        Business Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="business-type"
                        value={settings.businessType}
                        onChange={(e) => updateSetting('', 'businessType', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-bold text-gray-700 cursor-pointer hover:shadow-md transition-all duration-300"
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
                      <div id="business-type-help" className="text-xs font-medium text-gray-500">
                        Select the type that best describes your business
                      </div>
                    </div>

                    <div className="group relative space-y-2">
                      <label htmlFor="timezone" className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                        Timezone <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="timezone"
                        value={settings.timezone}
                        onChange={(e) => updateSetting('', 'timezone', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-bold text-gray-700 cursor-pointer hover:shadow-md transition-all duration-300"
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
                      <div id="timezone-help" className="text-xs font-medium text-gray-500">
                        Used for time calculations and reporting
                      </div>
                    </div>

                    <div className="group relative space-y-2">
                      <label htmlFor="currency" className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                        Currency <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="currency"
                        value={settings.currency}
                        onChange={(e) => updateSetting('', 'currency', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-bold text-gray-700 cursor-pointer hover:shadow-md transition-all duration-300"
                        required
                        aria-describedby="currency-help"
                      >
                        <option value="USD">USD ($) - US Dollar</option>
                        <option value="CAD">CAD ($) - Canadian Dollar</option>
                        <option value="EUR">EUR (€) - Euro</option>
                        <option value="GBP">GBP (£) - British Pound</option>
                      </select>
                      <div id="currency-help" className="text-xs font-medium text-gray-500">
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
                  <h3 className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                    Work Hours Configuration
                    <div className="h-1 w-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" />
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="daily-hours" className="block text-sm font-medium text-gray-700">
                        Standard Daily Hours <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="daily-hours"
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        value={settings.settings.workHours.standardDaily}
                        onChange={(e) => updateNestedSetting('workHours', '', 'standardDaily', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        aria-describedby="daily-hours-help"
                      />
                      <div id="daily-hours-help" className="text-xs text-gray-500">
                        Expected hours per work day (1-24)
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="weekly-hours" className="block text-sm font-medium text-gray-700">
                        Standard Weekly Hours <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="weekly-hours"
                        type="number"
                        min="1"
                        max="168"
                        step="0.5"
                        value={settings.settings.workHours.standardWeekly}
                        onChange={(e) => updateNestedSetting('workHours', '', 'standardWeekly', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        aria-describedby="weekly-hours-help"
                      />
                      <div id="weekly-hours-help" className="text-xs text-gray-500">
                        Expected hours per work week (1-168)
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="overtime-threshold" className="block text-sm font-medium text-gray-700">
                        Overtime Threshold <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="overtime-threshold"
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        value={settings.settings.workHours.overtimeThreshold}
                        onChange={(e) => updateNestedSetting('workHours', '', 'overtimeThreshold', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        aria-describedby="overtime-threshold-help"
                      />
                      <div id="overtime-threshold-help" className="text-xs text-gray-500">
                        Daily hours after which overtime applies
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="workweek-start" className="block text-sm font-medium text-gray-700">
                        Workweek Starts On <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="workweek-start"
                        value={settings.settings.workHours.workweekStart}
                        onChange={(e) => updateNestedSetting('workHours', '', 'workweekStart', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        aria-describedby="workweek-start-help"
                      >
                        <option value="sunday">Sunday</option>
                        <option value="monday">Monday</option>
                      </select>
                      <div id="workweek-start-help" className="text-xs text-gray-500">
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
                  <h3 className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                    Contact Information
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" />
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700">
                        Primary Contact Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={settings.contactInfo.primaryContactName}
                        onChange={(e) => updateSetting('contactInfo', 'primaryContactName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter primary contact name"
                        required
                        aria-describedby="contact-name-help"
                      />
                      <div id="contact-name-help" className="text-xs text-gray-500">
                        Main contact person for your organization
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">
                        Primary Contact Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={settings.contactInfo.primaryContactEmail}
                        onChange={(e) => updateSetting('contactInfo', 'primaryContactEmail', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="contact@company.com"
                        required
                        aria-describedby="contact-email-help"
                      />
                      <div id="contact-email-help" className="text-xs text-gray-500">
                        Email for system notifications and support
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        value={settings.contactInfo.phone || ''}
                        onChange={(e) => updateSetting('contactInfo', 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="+1 (555) 123-4567"
                        aria-describedby="contact-phone-help"
                      />
                      <div id="contact-phone-help" className="text-xs text-gray-500">
                        Optional business phone number
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="contact-address" className="block text-sm font-medium text-gray-700">
                        Business Address
                      </label>
                      <input
                        id="contact-address"
                        type="text"
                        value={settings.contactInfo.address || ''}
                        onChange={(e) => updateSetting('contactInfo', 'address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="123 Business St"
                        aria-describedby="contact-address-help"
                      />
                      <div id="contact-address-help" className="text-xs text-gray-500">
                        Street address for your main location
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="contact-city" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <input
                        id="contact-city"
                        type="text"
                        value={settings.contactInfo.city || ''}
                        onChange={(e) => updateSetting('contactInfo', 'city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="City name"
                        aria-describedby="contact-city-help"
                      />
                      <div id="contact-city-help" className="text-xs text-gray-500">
                        City where your business is located
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="contact-state" className="block text-sm font-medium text-gray-700">
                        State/Province
                      </label>
                      <input
                        id="contact-state"
                        type="text"
                        value={settings.contactInfo.state || ''}
                        onChange={(e) => updateSetting('contactInfo', 'state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="State or Province"
                        aria-describedby="contact-state-help"
                      />
                      <div id="contact-state-help" className="text-xs text-gray-500">
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

// Tab Navigation Icons
function BuildingOfficeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
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

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}

export default TenantSettingsPage;