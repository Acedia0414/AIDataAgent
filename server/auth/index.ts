/**
 * Authentication System Initialization
 * 
 * This module initializes and configures the authentication system.
 * It sets up both Azure AD and development authentication providers.
 * 
 * The system uses an abstraction layer that allows switching between providers
 * without changing business logic. This makes it easy to:
 * - Use Azure AD in production
 * - Use dev auth for local testing
 * - Add new providers in the future
 */

import { authRegistry } from './AuthProvider';
import { AzureADProvider } from './AzureADProvider';
import { DevAuthProvider } from './DevAuthProvider';

/**
 * Initialize the authentication system
 * 
 * This function:
 * 1. Reads configuration from environment variables
 * 2. Creates provider instances
 * 3. Registers providers with the registry
 * 4. Sets the primary provider based on configuration
 * 
 * Environment Variables:
 * - AUTH_PROVIDER: 'azuread' or 'dev' (default: 'dev')
 * - AZURE_AD_CLIENT_ID: Azure AD application ID
 * - AZURE_AD_TENANT_ID: Azure AD tenant ID
 * - AZURE_AD_CLIENT_SECRET: Azure AD client secret
 * - AZURE_AD_REDIRECT_URI: OAuth redirect URI
 */
export async function initializeAuth(): Promise<void> {
  console.log('[Auth] Initializing authentication system...');
  
  // Determine which provider to use as primary
  const primaryProvider = process.env.AUTH_PROVIDER || 'dev';
  
  // Always initialize dev provider for fallback
  const devProvider = new DevAuthProvider();
  await devProvider.initialize({});
  authRegistry.register(devProvider, primaryProvider === 'dev');
  console.log('[Auth] Development provider registered');
  
  // Initialize Azure AD provider if configured
  if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_TENANT_ID) {
    try {
      const azureProvider = new AzureADProvider();
      await azureProvider.initialize({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        tenantId: process.env.AZURE_AD_TENANT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
        redirectUri: process.env.AZURE_AD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
      });
      authRegistry.register(azureProvider, primaryProvider === 'azuread');
      console.log('[Auth] Azure AD provider registered');
    } catch (error) {
      console.error('[Auth] Failed to initialize Azure AD provider:', error);
      console.log('[Auth] Falling back to dev provider');
    }
  } else {
    console.log('[Auth] Azure AD credentials not configured, using dev provider only');
  }
  
  const primary = authRegistry.getPrimaryProvider();
  console.log(`[Auth] Primary authentication provider: ${primary.name}`);
}

// Export the registry for use in other modules
export { authRegistry };
