# Azure AD Authentication Testing Guide

This document provides a comprehensive testing checklist and scenarios for validating Azure AD authentication integration in the D365 F&O Data Agent.

## Prerequisites

Before testing Azure AD authentication, ensure you have:

- [ ] Azure AD tenant with administrative access
- [ ] D365 F&O environment with user accounts
- [ ] Azure Portal access to create app registrations
- [ ] Test users with different security roles
- [ ] Azure AD security groups configured

## Azure AD App Registration Setup

### Step 1: Create App Registration

1. Navigate to Azure Portal → Azure Active Directory → App registrations
2. Click "New registration"
3. Configure the application:
   - **Name**: D365 F&O Data Agent
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: 
     - Type: Web
     - URL: `https://your-domain.manus.space/api/auth/callback`
     - For local testing: `http://localhost:3000/api/auth/callback`
4. Click "Register"
5. Note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**

### Step 2: Create Client Secret

1. In your app registration, go to "Certificates & secrets"
2. Click "New client secret"
3. Add description: "D365 Data Agent Secret"
4. Set expiration (recommend: 24 months)
5. Click "Add"
6. **Important**: Copy the secret value immediately (it won't be shown again)

### Step 3: Configure API Permissions

1. Go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Select "Delegated permissions"
5. Add these permissions:
   - `User.Read` - Read user profile
   - `GroupMember.Read.All` - Read group memberships
   - `Directory.Read.All` - Read directory data
6. Click "Add permissions"
7. Click "Grant admin consent" (requires admin privileges)

### Step 4: Configure Authentication

1. Go to "Authentication"
2. Under "Implicit grant and hybrid flows":
   - ✅ Check "ID tokens"
3. Under "Advanced settings":
   - Allow public client flows: No
4. Click "Save"

## Environment Configuration

Add these environment variables to your `.env` file or Manus secrets:

```bash
# Authentication Provider Selection
AUTH_PROVIDER=azuread  # Use 'dev' for development fallback

# Azure AD Configuration
AZURE_AD_CLIENT_ID=your-client-id-here
AZURE_AD_TENANT_ID=your-tenant-id-here
AZURE_AD_CLIENT_SECRET=your-client-secret-here
AZURE_AD_REDIRECT_URI=https://your-domain.manus.space/api/auth/callback
```

## Testing Checklist

### 1. Development Fallback Authentication

Test the development authentication provider before Azure AD:

- [ ] **Login with default admin user**
  - Username: `admin`
  - Password: `admin123`
  - Expected: Successful login, redirected to chat page

- [ ] **Login with test user**
  - Username: `testuser`
  - Password: `test123`
  - Expected: Successful login with limited permissions

- [ ] **Invalid credentials**
  - Username: `admin`
  - Password: `wrongpassword`
  - Expected: Error message "Invalid username or password"

- [ ] **Session persistence**
  - Log in, refresh page
  - Expected: User remains logged in

- [ ] **Logout functionality**
  - Click logout
  - Expected: Redirected to home page, session cleared

### 2. Azure AD OAuth Flow

Test the complete Azure AD authentication flow:

- [ ] **Initial login redirect**
  - Click "Sign In" button
  - Expected: Redirected to Microsoft login page

- [ ] **Microsoft account login**
  - Enter Azure AD credentials
  - Expected: Microsoft authentication page

- [ ] **Consent screen** (first-time only)
  - Review requested permissions
  - Click "Accept"
  - Expected: Redirected back to application

- [ ] **Successful authentication**
  - After consent/login
  - Expected: Redirected to chat page with user info displayed

- [ ] **User profile data**
  - Check user menu/profile
  - Expected: Name and email from Azure AD displayed correctly

### 3. Azure AD Group Membership Fetching

Test that user's Azure AD groups are correctly retrieved:

- [ ] **User with single group**
  - Login with user in one Azure AD group
  - Check server logs for group IDs
  - Expected: Group ID logged in console

- [ ] **User with multiple groups**
  - Login with user in multiple groups
  - Expected: All group IDs retrieved

- [ ] **User with no groups**
  - Login with user not in any groups
  - Expected: Empty groups array, no errors

- [ ] **Group name resolution**
  - Check if group names are fetched (not just IDs)
  - Expected: Group display names available

### 4. Azure AD Group to D365 Role Mapping

Test the admin interface for managing group mappings:

- [ ] **Access admin interface**
  - Login as admin
  - Navigate to Settings → Azure AD Mappings
  - Expected: Mapping management UI displayed

- [ ] **Create new mapping**
  - Enter Azure Group ID: `test-group-id-123`
  - Enter Azure Group Name: `Finance Team`
  - Enter D365 Role: `Finance Manager`
  - Click "Create Mapping"
  - Expected: Success message, mapping appears in list

- [ ] **View existing mappings**
  - Check mappings list
  - Expected: All configured mappings displayed with details

- [ ] **Delete mapping**
  - Click "Delete" on a mapping
  - Expected: Confirmation, mapping removed from list

- [ ] **Non-admin access**
  - Login as regular user
  - Navigate to Settings → Azure AD Mappings
  - Expected: "Access Denied" message

### 5. Role-Based Access Control

Test that user roles are correctly applied:

- [ ] **Admin user permissions**
  - Login as admin
  - Expected: Access to all features (Settings, Metadata upload, etc.)

- [ ] **Regular user permissions**
  - Login as regular user
  - Try to access admin features
  - Expected: Access denied errors

- [ ] **Role assignment from Azure AD groups**
  - Create mapping: Azure Group → D365 Role
  - Login with user in that group
  - Check user's assigned roles in database
  - Expected: D365 role correctly assigned

- [ ] **Multiple role assignment**
  - User in multiple Azure AD groups
  - Each group mapped to different D365 roles
  - Expected: User receives all mapped roles

### 6. Session Management

Test session handling and token refresh:

- [ ] **Session persistence across page refreshes**
  - Login, refresh browser
  - Expected: User remains authenticated

- [ ] **Session expiration**
  - Wait for token expiration (or manually expire)
  - Try to access protected resource
  - Expected: Redirected to login

- [ ] **Logout clears session**
  - Login, then logout
  - Try to access protected page
  - Expected: Redirected to login

- [ ] **Concurrent sessions**
  - Login on two different browsers
  - Expected: Both sessions work independently

### 7. Error Handling

Test error scenarios:

- [ ] **Invalid Azure AD credentials**
  - Enter wrong password at Microsoft login
  - Expected: Microsoft error page, not application error

- [ ] **Cancelled authentication**
  - Start login, click "Cancel" on Microsoft page
  - Expected: Redirected back to home page

- [ ] **Missing API permissions**
  - Remove GroupMember.Read.All permission
  - Login
  - Expected: Error message about missing permissions

- [ ] **Invalid client secret**
  - Use wrong AZURE_AD_CLIENT_SECRET
  - Try to login
  - Expected: Authentication error, clear message

- [ ] **Network errors**
  - Simulate network failure during auth
  - Expected: User-friendly error message

### 8. Security Testing

Test security aspects:

- [ ] **HTTPS enforcement**
  - Try to use HTTP redirect URI in production
  - Expected: Azure AD rejects non-HTTPS URIs

- [ ] **CSRF protection**
  - Check that state parameter is used in OAuth flow
  - Expected: State validation prevents CSRF attacks

- [ ] **Token storage**
  - Inspect browser storage (localStorage, cookies)
  - Expected: Tokens stored securely (httpOnly cookies)

- [ ] **Token expiration**
  - Check token expiration time
  - Expected: Reasonable expiration (e.g., 1 hour)

### 9. Integration Testing

Test end-to-end scenarios:

- [ ] **Complete user journey**
  1. User visits application
  2. Clicks "Sign In"
  3. Authenticates with Azure AD
  4. Grants consent
  5. Redirected to chat page
  6. Uploads metadata
  7. Runs query
  8. Logs out
  - Expected: All steps work smoothly

- [ ] **Role-based query filtering** (when implemented)
  - User with Finance role
  - Query financial data
  - Expected: Only authorized data returned

- [ ] **Cross-browser compatibility**
  - Test on Chrome, Firefox, Safari, Edge
  - Expected: Works consistently across browsers

## Testing Scenarios

### Scenario 1: New User First Login

**Setup:**
- New user never logged in before
- User is member of "Finance Team" Azure AD group
- "Finance Team" mapped to "Finance Manager" D365 role

**Steps:**
1. User clicks "Sign In"
2. Redirected to Microsoft login
3. Enters credentials
4. Sees consent screen
5. Clicks "Accept"
6. Redirected to application

**Expected Results:**
- User profile created in database
- User assigned "Finance Manager" role
- User can access finance-related features
- User cannot access admin features

### Scenario 2: Existing User Login

**Setup:**
- User has logged in before
- User's Azure AD groups have changed (added to new group)
- New group mapped to additional D365 role

**Steps:**
1. User clicks "Sign In"
2. Redirected to Microsoft (no consent needed)
3. Authenticates
4. Redirected back

**Expected Results:**
- User's roles updated to reflect new group membership
- User now has permissions from both old and new roles
- Previous conversation history preserved

### Scenario 3: Admin Configures Role Mappings

**Setup:**
- Admin user logged in
- New Azure AD group created: "Warehouse Team"
- Need to map to "Warehouse Manager" D365 role

**Steps:**
1. Admin navigates to Settings → Azure AD Mappings
2. Enters group ID from Azure Portal
3. Enters group name: "Warehouse Team"
4. Enters D365 role: "Warehouse Manager"
5. Clicks "Create Mapping"

**Expected Results:**
- Mapping saved to database
- Future logins by "Warehouse Team" members get "Warehouse Manager" role
- Existing logged-in users need to re-login to get new role

### Scenario 4: User Loses Group Membership

**Setup:**
- User currently has "Finance Manager" role
- Admin removes user from "Finance Team" Azure AD group

**Steps:**
1. User logs out
2. User logs back in
3. User tries to access finance features

**Expected Results:**
- User's "Finance Manager" role removed
- User cannot access finance features
- Clear error message about insufficient permissions

## Troubleshooting

### Common Issues

**Issue: "AADSTS50011: The reply URL specified in the request does not match"**
- **Cause**: Redirect URI mismatch
- **Solution**: Ensure AZURE_AD_REDIRECT_URI matches exactly in app registration

**Issue: "AADSTS65001: The user or administrator has not consented"**
- **Cause**: Missing admin consent for API permissions
- **Solution**: Grant admin consent in Azure Portal

**Issue: "Cannot read groups: Insufficient privileges"**
- **Cause**: Missing GroupMember.Read.All permission
- **Solution**: Add permission and grant admin consent

**Issue: User logged in but no roles assigned**
- **Cause**: No Azure AD group mappings configured
- **Solution**: Create mappings in Settings → Azure AD Mappings

**Issue: Development auth not working**
- **Cause**: AUTH_PROVIDER set to 'azuread' but Azure AD not configured
- **Solution**: Set AUTH_PROVIDER='dev' for local testing

## Automated Testing

For automated testing, consider:

```typescript
// Example vitest test
describe('Azure AD Authentication', () => {
  it('should redirect to Microsoft login', async () => {
    const response = await fetch('/api/auth/login');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('login.microsoftonline.com');
  });
  
  it('should handle callback with valid code', async () => {
    const response = await fetch('/api/auth/callback?code=valid-code&state=valid-state');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/chat');
  });
});
```

## Reporting Issues

When reporting authentication issues, include:

1. Browser and version
2. Error message (exact text)
3. Server logs (check console for [Auth] messages)
4. Steps to reproduce
5. Expected vs actual behavior
6. Environment (development/production)
7. AUTH_PROVIDER setting

## Next Steps

After completing this testing checklist:

1. Document any issues found
2. Update configuration based on findings
3. Train users on login process
4. Monitor authentication logs in production
5. Set up alerts for authentication failures
6. Plan for token refresh implementation
7. Consider implementing MFA requirements
