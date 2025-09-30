'use client';

import React, { useState, useEffect } from 'react';
import { tenantAPI } from '../../utils/api';
import OklokLogo from '@/components/ui/OklokLogo';

interface BusinessType {
  name: string;
  description: string;
  features: string[];
  defaultSettings: any;
}

interface SubscriptionPlan {
  name: string;
  price: { monthly: number; annual: number };
  limits: { users: number | string; projects: number | string; locations: number | string };
  features: string[];
  additionalFees?: any;
}

const TenantSignup: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessTypes, setBusinessTypes] = useState<Record<string, BusinessType>>({});
  const [subscriptionPlans, setSubscriptionPlans] = useState<Record<string, SubscriptionPlan>>({});
  
  const [formData, setFormData] = useState({
    // Organization info
    name: '',
    subdomain: '',
    businessType: '',
    industry: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    currency: 'USD',
    
    // Admin user info
    adminUser: {
      name: '',
      email: '',
      pin: '',
      phone: ''
    },
    
    // Contact info
    contactInfo: {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    
    // Subscription
    subscriptionPlan: 'basic'
  });
  
  const [createdTenant, setCreatedTenant] = useState<any>(null);

  // Load business types and subscription plans
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [businessTypesData, plansData] = await Promise.all([
          tenantAPI.getBusinessTypes(),
          tenantAPI.getSubscriptionPlans()
        ]);
        
        setBusinessTypes(businessTypesData.businessTypes);
        setSubscriptionPlans(plansData.plans);
      } catch (err: any) {
        console.error('Failed to load initial data:', err);
        setError('Failed to load signup information. Please refresh the page.');
      }
    };
    
    loadInitialData();
  }, []);

  const handleInputChange = (section: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...((prev as any)[section] || {}),
        [field]: value
      }
    }));
  };

  const handleDirectChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!(formData.name && formData.subdomain && formData.businessType);
      case 2:
        return !!(formData.adminUser.name && formData.adminUser.email && formData.adminUser.pin);
      case 3:
        return true; // Contact info is optional
      case 4:
        return !!(formData.subscriptionPlan);
      default:
        return false;
    }
  };

  const generateSubdomain = (orgName: string) => {
    return orgName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
  };

  const handleCreateTenant = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const tenantData = {
        name: formData.name.trim(),
        subdomain: formData.subdomain.trim(),
        businessType: formData.businessType,
        industry: formData.industry || 'General',
        timezone: formData.timezone,
        currency: formData.currency,
        adminUser: {
          name: formData.adminUser.name.trim(),
          email: formData.adminUser.email.trim(),
          pin: formData.adminUser.pin,
          phone: formData.adminUser.phone || undefined
        },
        contactInfo: {
          ...formData.contactInfo,
          primaryContactName: formData.adminUser.name.trim(),
          primaryContactEmail: formData.adminUser.email.trim(),
          phone: formData.adminUser.phone || undefined
        },
        subscriptionPlan: formData.subscriptionPlan
      };
      
      const result = await tenantAPI.createTenant(tenantData);
      setCreatedTenant(result);
      setStep(5); // Success step
      
    } catch (err: any) {
      console.error('Tenant creation failed:', err);
      setError(err.message || 'Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (createdTenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Welcome!</h2>
              <p className="mt-2 text-sm text-gray-600">
                Your organization has been created successfully.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">Getting Started</h3>
                <div className="space-y-2 text-sm text-blue-700">
                  <p><strong>Login URL:</strong> {createdTenant.setupInstructions?.loginUrl}</p>
                  <p><strong>Admin PIN:</strong> {createdTenant.setupInstructions?.adminPin}</p>
                  <p><strong>Trial Period:</strong> {createdTenant.setupInstructions?.trialPeriod}</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Important Notes</h3>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• Save your admin PIN - you'll need it to login</li>
                  <li>• Bookmark your login URL for easy access</li>
                  <li>• You can add team members after logging in</li>
                  <li>• Configure your organization settings from the admin panel</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <a
                  href={createdTenant.setupInstructions?.loginUrl}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-center text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Go to Dashboard
                </a>
                <button
                  onClick={() => window.location.href = '/signup'}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-300"
                >
                  Create Another
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <OklokLogo size="lg" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create Your Organization
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Step {step} of 4 - Set up your time tracking workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div
                  key={stepNumber}
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    step >= stepNumber
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {stepNumber}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Organization</span>
              <span>Admin User</span>
              <span>Contact Info</span>
              <span>Plan</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <form className="space-y-6">
            {/* Step 1: Organization Information */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Organization Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      handleDirectChange('name', e.target.value);
                      if (!formData.subdomain) {
                        handleDirectChange('subdomain', generateSubdomain(e.target.value));
                      }
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subdomain *
                  </label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={formData.subdomain}
                      onChange={(e) => handleDirectChange('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="block w-full border border-gray-300 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="yourcompany"
                    />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      .oklok.com
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">This will be your login URL</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Business Type *
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => handleDirectChange('businessType', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select your business type</option>
                    {Object.entries(businessTypes).map(([key, type]) => (
                      <option key={key} value={key}>{type.name}</option>
                    ))}
                  </select>
                  {formData.businessType && businessTypes[formData.businessType] && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-700">
                        {businessTypes[formData.businessType].description}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Industry (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => handleDirectChange('industry', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Technology, Healthcare, Manufacturing"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Admin User */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Admin User Setup</h3>
                <p className="text-sm text-gray-600">This will be your main administrator account.</p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.adminUser.name}
                    onChange={(e) => handleInputChange('adminUser', 'name', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.adminUser.email}
                    onChange={(e) => handleInputChange('adminUser', 'email', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john@yourcompany.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Login PIN (4-8 digits) *
                  </label>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={formData.adminUser.pin}
                    onChange={(e) => handleInputChange('adminUser', 'pin', e.target.value.replace(/\D/g, ''))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1234"
                  />
                  <p className="mt-1 text-xs text-gray-500">You'll use this PIN to login to the system</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.adminUser.phone}
                    onChange={(e) => handleInputChange('adminUser', 'phone', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Contact Information */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                <p className="text-sm text-gray-600">Business address and contact details (optional).</p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    value={formData.contactInfo.address}
                    onChange={(e) => handleInputChange('contactInfo', 'address', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123 Business St"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      value={formData.contactInfo.city}
                      onChange={(e) => handleInputChange('contactInfo', 'city', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <input
                      type="text"
                      value={formData.contactInfo.state}
                      onChange={(e) => handleInputChange('contactInfo', 'state', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="NY"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.contactInfo.zipCode}
                    onChange={(e) => handleInputChange('contactInfo', 'zipCode', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timezone</label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => handleDirectChange('timezone', e.target.value)}
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
                      value={formData.currency}
                      onChange={(e) => handleDirectChange('currency', e.target.value)}
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
            )}

            {/* Step 4: Subscription Plan */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Choose Your Plan</h3>
                <p className="text-sm text-gray-600">Start with a 14-day free trial on any plan.</p>
                
                <div className="space-y-3">
                  {Object.entries(subscriptionPlans).map(([planKey, plan]) => (
                    <div
                      key={planKey}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.subscriptionPlan === planKey
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleDirectChange('subscriptionPlan', planKey)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="plan"
                              checked={formData.subscriptionPlan === planKey}
                              onChange={() => handleDirectChange('subscriptionPlan', planKey)}
                              className="mr-3"
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">{plan.name}</h4>
                              <p className="text-sm text-gray-600">
                                ${plan.price.monthly}/month per user
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 ml-6">
                            <p className="text-xs text-gray-500">
                              Up to {plan.limits.users} users, {plan.limits.projects} projects
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            Free trial for 14 days
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {formData.subscriptionPlan && subscriptionPlans[formData.subscriptionPlan] && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Features included:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {subscriptionPlans[formData.subscriptionPlan].features.map((feature, idx) => (
                        <li key={idx} className="flex items-center">
                          <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={() => step > 1 && setStep(step - 1)}
                disabled={step === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => validateStep(step) && setStep(step + 1)}
                  disabled={!validateStep(step)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateTenant}
                  disabled={loading || !validateStep(4)}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Organization'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TenantSignup;