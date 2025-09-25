import { ComplianceProvider } from '../interfaces/ComplianceProvider';
import { SouthAfricanComplianceProvider } from '../providers/SouthAfricanComplianceProvider';

/**
 * Factory for creating country-specific compliance providers
 * Supports adding new countries by registering new providers
 */
export class ComplianceProviderFactory {
  private static providers = new Map<string, new() => ComplianceProvider>();
  
  /**
   * Register compliance providers during application startup
   */
  static initialize() {
    // Register South African provider
    this.providers.set('ZA', SouthAfricanComplianceProvider);
    
    // Future providers can be registered here:
    // this.providers.set('US', USComplianceProvider);
    // this.providers.set('UK', UKComplianceProvider);
    // this.providers.set('AU', AustralianComplianceProvider);
  }
  
  /**
   * Get compliance provider for a specific country
   */
  static getProvider(countryCode: string): ComplianceProvider {
    const ProviderClass = this.providers.get(countryCode.toUpperCase());
    
    if (!ProviderClass) {
      throw new Error(`No compliance provider available for country: ${countryCode}`);
    }
    
    return new ProviderClass();
  }
  
  /**
   * Get all supported country codes
   */
  static getSupportedCountries(): string[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Check if a country is supported
   */
  static isCountrySupported(countryCode: string): boolean {
    return this.providers.has(countryCode.toUpperCase());
  }
  
  /**
   * Register a new compliance provider
   * Useful for adding new countries at runtime or in plugins
   */
  static registerProvider(countryCode: string, providerClass: new() => ComplianceProvider) {
    this.providers.set(countryCode.toUpperCase(), providerClass);
  }
  
  /**
   * Get provider configuration without instantiating
   */
  static getProviderConfig(countryCode: string): any {
    const provider = this.getProvider(countryCode);
    return provider.getConfig();
  }
}

// Initialize providers when module is imported
ComplianceProviderFactory.initialize();