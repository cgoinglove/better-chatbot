## Social Login Setup (Google, GitHub & Okta)

### Get your Google credentials
To use Google as a social provider, you need to get your Google credentials. You can get them by creating a new project in the [Google Cloud Console](https://console.cloud.google.com/apis/dashboard).

- In the Google Cloud Console, go to **APIs & Services > Credentials**.
- Click **Create Credentials** and select **OAuth client ID**.
- Choose **Web application** as the application type.
- In **Authorized redirect URIs**, set:
  - For local development: `http://localhost:3000/api/auth/callback/google`
  - For production: your deployed application's URL, e.g. `https://example.com/api/auth/callback/google`
- If you change the base path of your authentication routes, update the redirect URL accordingly.
- After creation, copy your **Client ID** and **Client Secret** and add them to your `.env` file:
  ```
  GOOGLE_CLIENT_ID=your_client_id
  GOOGLE_CLIENT_SECRET=your_client_secret
  ```

### Get your GitHub credentials
To use GitHub sign in, you need a client ID and client secret. You can get them from the [GitHub Developer Portal](https://github.com/settings/developers).

- For local development, set the redirect URL to:
  - `http://localhost:3000/api/auth/callback/github`
- For production, set it to your deployed application's URL, e.g.:
  - `https://your-domain.com/api/auth/callback/github`
- If you change the base path of your authentication routes, make sure to update the redirect URL accordingly.
- **Important:** You MUST include the `user:email` scope in your GitHub app to ensure the application can access the user's email address.
- Add your credentials to your `.env` file:
  ```
  GITHUB_CLIENT_ID=your_client_id
  GITHUB_CLIENT_SECRET=your_client_secret
  ```

### Get your Okta credentials
To use Okta as a social provider, you need to set up an OAuth application in your Okta Developer Console.

#### Prerequisites
- An Okta developer account or access to your organization's Okta admin console
- Admin privileges to create OAuth applications

#### Setup Steps

1. **Log into your Okta Admin Console**
   - Go to your Okta domain (e.g., `https://your-domain.okta.com`)
   - Sign in with admin credentials

2. **Create a new OAuth Application**
   - Navigate to **Applications** > **Applications**
   - Click **Create App Integration**
   - Select **OIDC - OpenID Connect** as the sign-in method
   - Choose **Web Application** as the application type

3. **Configure Application Settings**
   - **App integration name**: `MCP Client Chatbot` (or your preferred name)
   - **Grant type**: Select **Authorization Code**
   - **Sign-in redirect URIs**:
     - For local development: `http://localhost:3000/api/auth/callback/okta`
     - For production: `https://your-domain.com/api/auth/callback/okta`
   - **Sign-out redirect URIs**: (Optional) Set if you want custom logout behavior
   - **Controlled access**: Choose appropriate access level for your organization

4. **Get your credentials**
   - After creation, note down your **Client ID** and **Client Secret**
   - Your **Okta Domain** is your organization's Okta URL (e.g., `dev-12345.okta.com`)

5. **Add to environment variables**
   ```env
   OKTA_DOMAIN=your-okta-domain.okta.com
   OKTA_CLIENT_ID=your_client_id
   OKTA_CLIENT_SECRET=your_client_secret
   ```

#### Important Notes
- The Okta integration uses **OpenID Connect Discovery** for automatic configuration
- **PKCE (Proof Key for Code Exchange)** is enabled for enhanced security
- The integration requests `openid`, `profile`, and `email` scopes
- Users can link their Okta account with existing accounts created via other providers

## Environment Variable Check

Make sure your `.env` file contains the following variables for the providers you want to use:

```env
# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Okta OAuth (optional)
OKTA_DOMAIN=your-okta-domain.okta.com
OKTA_CLIENT_ID=your_okta_client_id
OKTA_CLIENT_SECRET=your_okta_client_secret
```

## Troubleshooting

### Okta-specific Issues

**"Invalid redirect URI" error:**
- Ensure your redirect URI in Okta matches exactly: `http://localhost:3000/api/auth/callback/okta` (development) or `https://your-domain.com/api/auth/callback/okta` (production)
- Check that your `BETTER_AUTH_URL` environment variable is set correctly for production

**"Client authentication failed" error:**
- Verify your `OKTA_CLIENT_ID` and `OKTA_CLIENT_SECRET` are correct
- Ensure your Okta application is configured as a "Web Application" with "Authorization Code" grant type

**"Discovery endpoint not found" error:**
- Confirm your `OKTA_DOMAIN` is correct and accessible
- The domain should be in format: `your-domain.okta.com` (without `https://`)

## Done

You can now sign in to MCP Client Chatbot using your Google, GitHub, or Okta account. Restart the application to apply the changes. 