/**
 * Authentication Provider Abstraction Layer
 * 
 * This module provides a unified interface for different authentication mechanisms.
 * It allows the application to support multiple identity providers (Azure AD, dev fallback, etc.)
 * without tightly coupling the business logic to a specific authentication implementation.
 * 
 * Design Principles:
 * - Loose coupling: Business logic doesn't depend on specific auth providers
 * - Extensibility: New providers can be added without modifying existing code
 * - Testability: Each provider can be tested independently
 * - Forward compatibility: Designed to support future fine-grained access control
 */

/**
 * Represents a user after successful authentication
 * This is the standardized user object that all providers must return
 */
export interface AuthenticatedUser {
  /** Unique identifier from the identity provider */
  providerId: string;
  
  /** User's email address */
  email: string;
  
  /** User's display name */
  name: string;
  
  /** Authentication method used (e.g., 'azuread', 'dev') */
  loginMethod: string;
  
  /** Groups the user belongs to (from Azure AD or other providers) */
  groups?: string[];
  
  /** D365 security roles assigned to this user */
  d365Roles?: string[];
  
  /** Additional metadata from the provider */
  metadata?: Record<string, any>;
}

/**
 * Configuration for Azure AD authentication
 */
export interface AzureADConfig {
  /** Azure AD Application (client) ID */
  clientId: string;
  
  /** Azure AD Directory (tenant) ID */
  tenantId: string;
  
  /** Client secret for confidential client flow */
  clientSecret: string;
  
  /** Redirect URI after authentication */
  redirectUri: string;
}

/**
 * Abstract base class for authentication providers
 * All authentication providers must extend this class and implement its methods
 */
export abstract class AuthProvider {
  /**
   * Name of the authentication provider (e.g., 'azuread', 'dev')
   */
  abstract readonly name: string;
  
  /**
   * Initialize the authentication provider with configuration
   * This is called once when the application starts
   */
  abstract initialize(config: any): Promise<void>;
  
  /**
   * Handle the authentication callback after user logs in
   * This is called when the OAuth provider redirects back to the application
   * 
   * @param callbackData - Data from the OAuth callback (e.g., authorization code)
   * @returns Authenticated user information
   */
  abstract handleCallback(callbackData: any): Promise<AuthenticatedUser>;
  
  /**
   * Get the login URL to redirect users to for authentication
   * 
   * @returns URL where users should be redirected to log in
   */
  abstract getLoginUrl(): string;
  
  /**
   * Validate and refresh an existing session/token if needed
   * This is called on subsequent requests to verify the user is still authenticated
   * 
   * @param token - Session token or access token
   * @returns Authenticated user information if token is valid, null otherwise
   */
  abstract validateToken(token: string): Promise<AuthenticatedUser | null>;
  
  /**
   * Log out the user and invalidate their session
   * 
   * @param userId - User identifier to log out
   */
  abstract logout(userId: string): Promise<void>;
}

/**
 * Authentication provider registry
 * Manages multiple authentication providers and routes requests to the appropriate one
 */
export class AuthProviderRegistry {
  private providers: Map<string, AuthProvider> = new Map();
  private primaryProvider: string | null = null;
  
  /**
   * Register an authentication provider
   * 
   * @param provider - Authentication provider instance
   * @param isPrimary - Whether this is the primary authentication method
   */
  register(provider: AuthProvider, isPrimary: boolean = false): void {
    this.providers.set(provider.name, provider);
    
    if (isPrimary || this.primaryProvider === null) {
      this.primaryProvider = provider.name;
    }
  }
  
  /**
   * Get a specific authentication provider by name
   * 
   * @param name - Provider name (e.g., 'azuread', 'dev')
   * @returns Authentication provider instance or undefined if not found
   */
  getProvider(name: string): AuthProvider | undefined {
    return this.providers.get(name);
  }
  
  /**
   * Get the primary authentication provider
   * This is the default provider used for login
   * 
   * @returns Primary authentication provider
   */
  getPrimaryProvider(): AuthProvider {
    if (!this.primaryProvider) {
      throw new Error('No authentication provider registered');
    }
    
    const provider = this.providers.get(this.primaryProvider);
    if (!provider) {
      throw new Error(`Primary provider '${this.primaryProvider}' not found`);
    }
    
    return provider;
  }
  
  /**
   * Get all registered provider names
   * 
   * @returns Array of provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * Global authentication provider registry instance
 * This is used throughout the application to access authentication providers
 */
export const authRegistry = new AuthProviderRegistry();
