/**
 * Azure AD Authentication Provider
 * 
 * This provider implements authentication using Microsoft Azure Active Directory (Entra ID).
 * It uses the Microsoft Authentication Library (MSAL) to handle OAuth 2.0 flows.
 * 
 * Key Features:
 * - OAuth 2.0 authorization code flow for secure authentication
 * - Fetches user's Azure AD group memberships
 * - Maps Azure AD groups to D365 security roles
 * - Supports token validation and refresh
 * 
 * Setup Requirements:
 * 1. Register an application in Azure Portal
 * 2. Configure redirect URI
 * 3. Grant API permissions (User.Read, GroupMember.Read.All)
 * 4. Create client secret
 * 5. Set environment variables (see below)
 */

import { ConfidentialClientApplication, AuthorizationUrlRequest, AuthorizationCodeRequest } from '@azure/msal-node';
import { AuthProvider, AuthenticatedUser, AzureADConfig } from './AuthProvider';
import * as db from '../db';

/**
 * Azure AD authentication provider using MSAL
 */
export class AzureADProvider extends AuthProvider {
  readonly name = 'azuread';
  
  private msalClient: ConfidentialClientApplication | null = null;
  private config: AzureADConfig | null = null;
  
  /**
   * Initialize the Azure AD provider with configuration
   * 
   * Environment Variables Required:
   * - AZURE_AD_CLIENT_ID: Application (client) ID from Azure Portal
   * - AZURE_AD_TENANT_ID: Directory (tenant) ID from Azure Portal
   * - AZURE_AD_CLIENT_SECRET: Client secret from Azure Portal
   * - AZURE_AD_REDIRECT_URI: Redirect URI configured in Azure Portal
   * 
   * @param config - Azure AD configuration
   */
  async initialize(config: AzureADConfig): Promise<void> {
    this.config = config;
    
    // Create MSAL confidential client application
    // This handles the OAuth 2.0 authorization code flow
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        clientSecret: config.clientSecret,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) return;
            console.log(`[MSAL] ${message}`);
          },
          piiLoggingEnabled: false,
          logLevel: 3, // Error level
        },
      },
    });
    
    console.log('[AzureADProvider] Initialized with tenant:', config.tenantId);
  }
  
  /**
   * Get the Azure AD login URL
   * Users will be redirected to this URL to authenticate with Microsoft
   * 
   * @returns Azure AD login URL
   */
  getLoginUrl(): string {
    if (!this.msalClient || !this.config) {
      throw new Error('Azure AD provider not initialized');
    }
    
    // Request authorization URL from MSAL
    // This generates a URL that redirects to Microsoft's login page
    const authCodeUrlParameters: AuthorizationUrlRequest = {
      scopes: [
        'user.read',           // Read user profile
        'GroupMember.Read.All' // Read group memberships (requires admin consent)
      ],
      redirectUri: this.config.redirectUri,
    };
    
    // Note: In a real implementation, you would call msalClient.getAuthCodeUrl()
    // For now, we return a placeholder that can be updated when the app is configured
    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?client_id=${this.config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.config.redirectUri)}&scope=user.read%20GroupMember.Read.All`;
  }
  
  /**
   * Handle OAuth callback after user authenticates with Azure AD
   * 
   * Flow:
   * 1. User clicks login → redirected to Azure AD
   * 2. User authenticates with Microsoft
   * 3. Azure AD redirects back to our app with authorization code
   * 4. We exchange the code for an access token
   * 5. We fetch user profile and group memberships
   * 6. We map Azure AD groups to D365 roles
   * 
   * @param callbackData - Contains authorization code from Azure AD
   * @returns Authenticated user with D365 roles
   */
  async handleCallback(callbackData: { code: string }): Promise<AuthenticatedUser> {
    if (!this.msalClient || !this.config) {
      throw new Error('Azure AD provider not initialized');
    }
    
    try {
      // Exchange authorization code for access token
      const tokenRequest: AuthorizationCodeRequest = {
        code: callbackData.code,
        scopes: ['user.read', 'GroupMember.Read.All'],
        redirectUri: this.config.redirectUri,
      };
      
      const response = await this.msalClient.acquireTokenByCode(tokenRequest);
      
      if (!response || !response.account) {
        throw new Error('Failed to acquire token from Azure AD');
      }
      
      // Extract user information from the token
      const account = response.account;
      const email = account.username; // In Azure AD, username is typically the email
      const name = account.name || email;
      const providerId = account.homeAccountId; // Unique Azure AD identifier
      
      // Fetch user's Azure AD group memberships
      // This requires the GroupMember.Read.All permission
      const groups = await this.fetchUserGroups(response.accessToken);
      
      // Map Azure AD groups to D365 security roles
      // This is done by looking up the group-to-role mappings in the database
      const d365Roles = await this.mapGroupsToRoles(groups);
      
      return {
        providerId,
        email,
        name,
        loginMethod: 'azuread',
        groups,
        d365Roles,
        metadata: {
          tenantId: account.tenantId,
          azureAdUserId: account.localAccountId,
        },
      };
    } catch (error) {
      console.error('[AzureADProvider] Error handling callback:', error);
      throw new Error(`Azure AD authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Fetch user's Azure AD group memberships using Microsoft Graph API
   * 
   * @param accessToken - Access token with GroupMember.Read.All permission
   * @returns Array of group IDs the user belongs to
   */
  private async fetchUserGroups(accessToken: string): Promise<string[]> {
    try {
      // Call Microsoft Graph API to get user's group memberships
      // https://graph.microsoft.com/v1.0/me/memberOf
      const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('[AzureADProvider] Failed to fetch groups:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      
      // Extract group IDs from the response
      // Groups have an 'id' property which is the group's unique identifier
      const groups = data.value
        .filter((item: any) => item['@odata.type'] === '#microsoft.graph.group')
        .map((group: any) => group.id);
      
      console.log(`[AzureADProvider] User belongs to ${groups.length} groups`);
      return groups;
    } catch (error) {
      console.error('[AzureADProvider] Error fetching groups:', error);
      return [];
    }
  }
  
  /**
   * Map Azure AD group IDs to D365 security roles
   * 
   * This looks up the group-to-role mappings stored in the database.
   * Admins can configure these mappings through the admin interface.
   * 
   * Example mapping:
   * Azure AD Group: "D365-Finance-Managers" (ID: abc123...)
   * → D365 Role: "Finance Manager"
   * 
   * @param groups - Array of Azure AD group IDs
   * @returns Array of D365 security role names
   */
  private async mapGroupsToRoles(groups: string[]): Promise<string[]> {
    if (groups.length === 0) {
      return [];
    }
    
    try {
      // Query database for group-to-role mappings
      // This will be implemented in the database layer
      const roles = await db.getRolesByAzureGroups(groups);
      return roles;
    } catch (error) {
      console.error('[AzureADProvider] Error mapping groups to roles:', error);
      return [];
    }
  }
  
  /**
   * Validate an existing access token
   * 
   * In a production implementation, this would:
   * 1. Verify the token signature
   * 2. Check token expiration
   * 3. Refresh the token if needed
   * 
   * For now, we return null to force re-authentication
   * 
   * @param token - Access token to validate
   * @returns User information if valid, null otherwise
   */
  async validateToken(token: string): Promise<AuthenticatedUser | null> {
    // TODO: Implement token validation
    // This would typically involve:
    // 1. Decoding the JWT token
    // 2. Verifying the signature
    // 3. Checking expiration
    // 4. Refreshing if needed
    
    // For now, return null to force re-authentication
    return null;
  }
  
  /**
   * Log out the user
   * 
   * @param userId - User identifier to log out
   */
  async logout(userId: string): Promise<void> {
    // Azure AD logout is typically handled client-side
    // by clearing the session and redirecting to Azure AD logout endpoint
    console.log(`[AzureADProvider] User ${userId} logged out`);
  }
}
