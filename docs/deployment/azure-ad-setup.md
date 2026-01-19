# Azure AD Setup Guide

This guide walks through the complete process of configuring Azure Active Directory authentication for the D365 F&O Data Agent in a production environment.

## Overview

The D365 F&O Data Agent uses Azure AD OAuth 2.0 for enterprise authentication. This provides single sign-on (SSO) capabilities, allowing users to authenticate with their existing Microsoft 365/D365 credentials. The system also fetches user group memberships from Azure AD and maps them to D365 security roles for fine-grained access control.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │────────▶│  Data Agent  │────────▶│  Azure AD   │
│             │◀────────│  (Manus)     │◀────────│             │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                         │
      │                        │                         │
      ▼                        ▼                         ▼
  1. Click Login       2. Redirect to        3. User authenticates
                          Azure AD login
      │                        │                         │
      │                        │                         │
      ▼                        ▼                         ▼
  4. Enter credentials  5. Azure AD returns   6. Fetch user groups
                           auth code
      │                        │                         │
      │                        │                         │
      ▼                        ▼                         ▼
  7. Redirected back    8. Exchange code      9. Map groups to
     to application        for access token      D365 roles
```

## Prerequisites

Before starting, ensure you have:

- **Azure AD Tenant**: Your organization's Azure Active Directory
- **Global Administrator Access**: Required to create app registrations and grant permissions
- **D365 F&O Environment**: Access to your Dynamics 365 Finance and Operations instance
- **Manus Account**: Deployed D365 F&O Data Agent application

## Step 1: Create Azure AD App Registration

Navigate to the Azure Portal and create a new application registration to represent the D365 F&O Data Agent.

### 1.1 Access App Registrations

1. Open [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory**
3. Select **App registrations** from the left menu
4. Click **+ New registration**

### 1.2 Configure Basic Settings

Fill in the application details:

- **Name**: `D365 F&O Data Agent`
- **Supported account types**: Select "Accounts in this organizational directory only (Single tenant)"
- **Redirect URI**: 
  - Platform: **Web**
  - URI: `https://your-app-domain.manus.space/api/auth/callback`

Replace `your-app-domain` with your actual Manus application domain. You can find this in the Manus dashboard after deployment.

Click **Register** to create the application.

### 1.3 Note Application Identifiers

After registration, you'll see the application overview page. Record these values (you'll need them later):

- **Application (client) ID**: A GUID like `12345678-1234-1234-1234-123456789abc`
- **Directory (tenant) ID**: Your Azure AD tenant ID

## Step 2: Create Client Secret

The application needs a client secret to authenticate with Azure AD.

### 2.1 Generate Secret

1. In your app registration, select **Certificates & secrets** from the left menu
2. Under "Client secrets", click **+ New client secret**
3. Add a description: `D365 Data Agent Production Secret`
4. Select expiration period: **24 months** (recommended for production)
5. Click **Add**

### 2.2 Copy Secret Value

**Important**: The secret value is only shown once. Copy it immediately and store it securely. You'll configure this in Manus secrets later.

The secret looks like: `abcdefghijklmnopqrstuvwxyz123456789`

## Step 3: Configure API Permissions

The application needs permissions to read user profiles and group memberships from Azure AD.

### 3.1 Add Microsoft Graph Permissions

1. Select **API permissions** from the left menu
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**

### 3.2 Select Required Permissions

Add these three permissions:

| Permission | Type | Purpose |
|------------|------|---------|
| `User.Read` | Delegated | Read the signed-in user's profile (name, email) |
| `GroupMember.Read.All` | Delegated | Read group memberships of the signed-in user |
| `Directory.Read.All` | Delegated | Read directory data (group names, details) |

Click **Add permissions** after selecting all three.

### 3.3 Grant Admin Consent

These permissions require administrator consent because they access organizational data.

1. Click **Grant admin consent for [Your Organization]**
2. Confirm by clicking **Yes**
3. Wait for the status to change to "Granted for [Your Organization]"

All three permissions should now show a green checkmark in the "Status" column.

## Step 4: Configure Authentication Settings

Fine-tune the authentication behavior for security and compatibility.

### 4.1 Token Configuration

1. Select **Authentication** from the left menu
2. Under "Implicit grant and hybrid flows":
   - ✅ Check **ID tokens** (used for user authentication)
   - ❌ Leave "Access tokens" unchecked (not needed for this flow)

### 4.2 Advanced Settings

Scroll down to "Advanced settings":

- **Allow public client flows**: Set to **No** (this is a confidential client)
- **Enable the following mobile and desktop flows**: Leave unchecked

Click **Save** at the top of the page.

## Step 5: Configure Manus Application

Now that Azure AD is configured, add the credentials to your Manus application.

### 5.1 Access Manus Secrets

1. Open your Manus dashboard
2. Navigate to your D365 F&O Data Agent project
3. Go to **Settings** → **Secrets**

### 5.2 Add Environment Variables

Add these four secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `AUTH_PROVIDER` | `azuread` | `azuread` |
| `AZURE_AD_CLIENT_ID` | Application (client) ID from Step 1.3 | `12345678-1234-1234-1234-123456789abc` |
| `AZURE_AD_TENANT_ID` | Directory (tenant) ID from Step 1.3 | `87654321-4321-4321-4321-cba987654321` |
| `AZURE_AD_CLIENT_SECRET` | Client secret from Step 2.2 | `abcdefghijklmnopqrstuvwxyz123456789` |
| `AZURE_AD_REDIRECT_URI` | Same as configured in Step 1.2 | `https://your-app-domain.manus.space/api/auth/callback` |

### 5.3 Restart Application

After adding secrets, restart the application for changes to take effect. The authentication system will automatically initialize with Azure AD as the primary provider.

## Step 6: Configure Azure AD Group Mappings

Map your Azure AD security groups to D365 security roles to control user permissions.

### 6.1 Identify Azure AD Groups

First, identify the Azure AD groups that correspond to D365 roles:

1. In Azure Portal, go to **Azure Active Directory** → **Groups**
2. Find groups that represent D365 user roles (e.g., "Finance Team", "Warehouse Staff")
3. Click on each group and note the **Object ID** (a GUID)

### 6.2 Identify D365 Security Roles

Determine the D365 security role names you want to map:

- Finance Manager
- Sales Representative
- Warehouse Worker
- Purchasing Agent
- System Administrator

These should match the role names in your D365 F&O environment.

### 6.3 Create Mappings in Application

1. Log in to the D365 F&O Data Agent as an administrator
2. Navigate to **Settings** → **Azure AD Mappings**
3. For each mapping, fill in:
   - **Azure AD Group ID**: The Object ID from Step 6.1
   - **Azure AD Group Name**: Display name (optional, for clarity)
   - **D365 Security Role**: The role name from Step 6.2
   - **Description**: Optional note about the mapping

Example mappings:

| Azure Group | Azure Group ID | D365 Role | Description |
|-------------|----------------|-----------|-------------|
| Finance Team | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` | Finance Manager | Finance department users |
| Sales Team | `ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj` | Sales Representative | Sales department users |
| IT Admins | `kkkkkkkk-llll-mmmm-nnnn-oooooooooooo` | System Administrator | IT administrators |

Click **Create Mapping** for each entry.

## Step 7: Test Authentication

Verify that Azure AD authentication is working correctly.

### 7.1 Initial Login Test

1. Open the application in an incognito/private browser window
2. Click **Sign In**
3. You should be redirected to Microsoft's login page
4. Enter your Azure AD credentials
5. If this is your first login, you'll see a consent screen
6. Click **Accept** to grant permissions
7. You should be redirected back to the application chat page

### 7.2 Verify User Profile

After logging in:

1. Check that your name and email are displayed correctly (from Azure AD)
2. Navigate to **Settings** → **Security Roles**
3. Verify that your D365 roles are assigned based on your Azure AD group memberships

### 7.3 Test Role-Based Access

1. Log in as a user with admin role
2. Verify access to **Settings** → **Azure AD Mappings**
3. Log in as a regular user
4. Verify that admin features are not accessible

## Step 8: User Onboarding

Prepare your users for the new authentication system.

### 8.1 Communication

Send an email to all users explaining:

- The application now uses Azure AD authentication
- Users should use their Microsoft 365/D365 credentials
- First-time users will see a consent screen
- Contact IT support if they encounter issues

### 8.2 Training Materials

Provide users with:

- Link to the application
- Screenshot of the login flow
- FAQ document addressing common questions
- IT support contact information

### 8.3 Gradual Rollout

Consider a phased approach:

1. **Week 1**: Test with IT team and power users
2. **Week 2**: Roll out to department leads
3. **Week 3**: Open to all users
4. **Ongoing**: Monitor authentication logs and gather feedback

## Troubleshooting

### Common Issues and Solutions

**Issue: "AADSTS50011: The reply URL specified in the request does not match the reply URLs configured for the application"**

**Solution**: The redirect URI in your Manus secrets must exactly match the one configured in Azure AD app registration. Check for trailing slashes and http vs https.

**Issue: "AADSTS65001: The user or administrator has not consented to use the application"**

**Solution**: Grant admin consent for API permissions in Azure Portal (Step 3.3).

**Issue: "User logged in but has no roles assigned"**

**Solution**: The user's Azure AD groups are not mapped to D365 roles. Add mappings in Settings → Azure AD Mappings (Step 6).

**Issue: "Cannot read user's groups: Insufficient privileges"**

**Solution**: The `GroupMember.Read.All` permission is missing or admin consent was not granted. Revisit Step 3.

### Checking Server Logs

To diagnose authentication issues, check the server logs in Manus:

1. Go to your project dashboard
2. Click on **Logs** or **Console**
3. Look for messages starting with `[Auth]` or `[AzureADProvider]`

Example log messages:

```
[Auth] Initializing authentication system...
[Auth] Azure AD provider registered
[Auth] Primary authentication provider: azuread
[AzureADProvider] User authenticated: john.doe@company.com
[AzureADProvider] User groups: ["group-id-1", "group-id-2"]
[Database] Mapped groups to roles: ["Finance Manager", "Sales Representative"]
```

## Security Best Practices

### Client Secret Management

- **Never commit secrets to version control**: Use Manus secrets or environment variables
- **Rotate secrets regularly**: Set a reminder to rotate every 12-24 months
- **Use separate secrets for dev/prod**: Create separate app registrations for each environment
- **Restrict access**: Only administrators should have access to client secrets

### Permission Scope

- **Principle of least privilege**: Only request permissions your application actually needs
- **Review permissions annually**: Remove unused permissions
- **Audit access**: Regularly review who has access to the app registration

### Monitoring

- **Enable Azure AD sign-in logs**: Monitor authentication attempts
- **Set up alerts**: Get notified of failed authentication attempts
- **Review group memberships**: Periodically audit user group assignments

## Advanced Configuration

### Multi-Tenant Support

If you need to support users from multiple Azure AD tenants:

1. Change "Supported account types" to "Accounts in any organizational directory"
2. Update the OAuth authority URL to use `/common` instead of tenant ID
3. Implement tenant-specific role mappings

### Custom Claims

To include additional user information in tokens:

1. In Azure AD, go to **Token configuration**
2. Click **Add optional claim**
3. Select claim type (ID, Access, or SAML)
4. Choose claims to include (e.g., `preferred_username`, `groups`)

### Conditional Access

To enforce additional security policies:

1. In Azure AD, go to **Security** → **Conditional Access**
2. Create a new policy targeting your app
3. Configure conditions (e.g., require MFA, block legacy authentication)
4. Set access controls (e.g., require compliant device)

## Maintenance

### Regular Tasks

- **Monthly**: Review authentication logs for anomalies
- **Quarterly**: Audit user group memberships and role mappings
- **Annually**: Rotate client secrets and review API permissions
- **As needed**: Update redirect URIs when deploying to new environments

### Monitoring Metrics

Track these metrics to ensure healthy authentication:

- **Login success rate**: Should be > 95%
- **Average login time**: Should be < 5 seconds
- **Failed login attempts**: Investigate spikes
- **Token refresh failures**: May indicate configuration issues

## Support

For issues with:

- **Azure AD configuration**: Contact your Azure AD administrator
- **Manus deployment**: Check Manus documentation or support
- **Application bugs**: Report to the development team
- **User access issues**: Verify group memberships in Azure AD

## Next Steps

After completing Azure AD setup:

1. ✅ Test authentication with multiple users
2. ✅ Configure role-based query filtering (if not already done)
3. ✅ Set up monitoring and alerts
4. ✅ Document your organization's specific group-to-role mappings
5. ✅ Train users on the new authentication flow
6. ✅ Plan for periodic security audits

## Appendix: Environment Variables Reference

Complete list of authentication-related environment variables:

```bash
# Authentication Provider
AUTH_PROVIDER=azuread              # 'azuread' or 'dev'

# Azure AD OAuth Configuration
AZURE_AD_CLIENT_ID=<client-id>     # From app registration
AZURE_AD_TENANT_ID=<tenant-id>     # Your Azure AD tenant
AZURE_AD_CLIENT_SECRET=<secret>    # Client secret value
AZURE_AD_REDIRECT_URI=<callback-url>  # Must match app registration

# Optional: Custom OAuth Endpoints (advanced)
# AZURE_AD_AUTHORITY=https://login.microsoftonline.com/<tenant-id>
# AZURE_AD_GRAPH_ENDPOINT=https://graph.microsoft.com/v1.0
```

## Appendix: ASCII Flow Diagram

```
User Authentication Flow
========================

┌──────────┐
│  User    │
│  Browser │
└────┬─────┘
     │
     │ 1. Click "Sign In"
     ▼
┌────────────────────┐
│  D365 Data Agent   │
│  (Manus Platform)  │
└────┬───────────────┘
     │
     │ 2. Generate OAuth URL with state
     ▼
┌────────────────────┐
│   Azure AD Login   │
│   (Microsoft)      │
└────┬───────────────┘
     │
     │ 3. User enters credentials
     │ 4. Azure AD validates
     │ 5. User grants consent (first time)
     ▼
┌────────────────────┐
│  Redirect back     │
│  with auth code    │
└────┬───────────────┘
     │
     │ 6. Exchange code for tokens
     ▼
┌────────────────────┐
│  Microsoft Graph   │
│  API               │
└────┬───────────────┘
     │
     │ 7. Fetch user profile
     │ 8. Fetch group memberships
     ▼
┌────────────────────┐
│  Database          │
│  - Store user      │
│  - Map groups      │
│  - Assign roles    │
└────┬───────────────┘
     │
     │ 9. Create session
     ▼
┌────────────────────┐
│  User logged in    │
│  Redirect to chat  │
└────────────────────┘
```
