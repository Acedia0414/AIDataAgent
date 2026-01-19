/**
 * Development Authentication Provider
 * 
 * This is a simple authentication provider for development and testing purposes.
 * It allows login with just a username and password stored in localStorage.
 * 
 * ⚠️ WARNING: This provider is NOT secure and should NEVER be used in production!
 * 
 * Features:
 * - Simple username/password authentication
 * - No external dependencies
 * - Credentials stored in localStorage (client-side only)
 * - Useful for testing without Azure AD setup
 * 
 * How it works:
 * 1. User enters username and password
 * 2. Credentials are checked against a simple in-memory store
 * 3. A session token is generated and returned
 * 4. Token is stored client-side for subsequent requests
 */

import { AuthProvider, AuthenticatedUser } from './AuthProvider';
import { randomBytes } from 'crypto';

/**
 * Simple in-memory user store for development
 * In a real application, this would be a database
 */
interface DevUser {
  username: string;
  password: string;
  email: string;
  name: string;
  d365Roles: string[];
}

/**
 * Development authentication provider
 * Uses simple username/password authentication
 */
export class DevAuthProvider extends AuthProvider {
  readonly name = 'dev';
  
  // In-memory user store (for development only!)
  private users: Map<string, DevUser> = new Map();
  
  // Active sessions (token -> user mapping)
  private sessions: Map<string, AuthenticatedUser> = new Map();
  
  /**
   * Initialize the development provider
   * 
   * Creates a default admin user for testing:
   * Username: admin
   * Password: admin123
   * 
   * @param config - Configuration (not used for dev provider)
   */
  async initialize(config: any): Promise<void> {
    // Create a default admin user for testing
    this.users.set('admin', {
      username: 'admin',
      password: 'admin123', // In production, this would be hashed!
      email: 'admin@example.com',
      name: 'Admin User',
      d365Roles: ['System Administrator'],
    });
    
    // Create a test user with limited permissions
    this.users.set('testuser', {
      username: 'testuser',
      password: 'test123',
      email: 'testuser@example.com',
      name: 'Test User',
      d365Roles: ['Finance User'],
    });
    
    console.log('[DevAuthProvider] Initialized with default users');
    console.log('[DevAuthProvider] Available users: admin (admin123), testuser (test123)');
  }
  
  /**
   * Get the login URL
   * For dev provider, this returns a special URL that indicates dev mode
   * 
   * @returns Dev login indicator
   */
  getLoginUrl(): string {
    return '/dev-login'; // This will be handled client-side
  }
  
  /**
   * Handle login with username and password
   * 
   * @param callbackData - Contains username and password
   * @returns Authenticated user with session token
   */
  async handleCallback(callbackData: { username: string; password: string }): Promise<AuthenticatedUser> {
    const { username, password } = callbackData;
    
    // Find user in the in-memory store
    const user = this.users.get(username);
    
    if (!user) {
      throw new Error('Invalid username or password');
    }
    
    // Check password (in production, this would use bcrypt or similar)
    if (user.password !== password) {
      throw new Error('Invalid username or password');
    }
    
    // Generate a session token
    const sessionToken = this.generateSessionToken();
    
    // Create authenticated user object
    const authenticatedUser: AuthenticatedUser = {
      providerId: `dev:${username}`,
      email: user.email,
      name: user.name,
      loginMethod: 'dev',
      d365Roles: user.d365Roles,
      metadata: {
        sessionToken,
        username,
      },
    };
    
    // Store session
    this.sessions.set(sessionToken, authenticatedUser);
    
    console.log(`[DevAuthProvider] User ${username} logged in`);
    
    return authenticatedUser;
  }
  
  /**
   * Validate a session token
   * 
   * @param token - Session token to validate
   * @returns User information if valid, null otherwise
   */
  async validateToken(token: string): Promise<AuthenticatedUser | null> {
    const user = this.sessions.get(token);
    
    if (!user) {
      return null;
    }
    
    return user;
  }
  
  /**
   * Log out the user and invalidate their session
   * 
   * @param userId - User identifier (session token in this case)
   */
  async logout(userId: string): Promise<void> {
    // Find and remove session by user ID
    for (const [token, user] of Array.from(this.sessions.entries())) {
      if (user.providerId === userId) {
        this.sessions.delete(token);
        console.log(`[DevAuthProvider] User ${user.name} logged out`);
        return;
      }
    }
  }
  
  /**
   * Generate a random session token
   * 
   * @returns Random session token
   */
  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }
  
  /**
   * Add a new user (for testing purposes)
   * 
   * @param user - User to add
   */
  addUser(user: DevUser): void {
    this.users.set(user.username, user);
    console.log(`[DevAuthProvider] Added user: ${user.username}`);
  }
}
