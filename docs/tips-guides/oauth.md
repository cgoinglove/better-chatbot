## Social Login Setup (Google, GitHub, Microsoft, Okta)

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

### Get your Microsoft credentials

To use Microsoft as a social provider, you need to get your Microsoft credentials. You can get them by creating a new app in the [Microsoft Azure Portal](https://portal.azure.com/).

- In the Microsoft Azure Portal, go to **Azure Active Directory > App registrations**.
- Click **New registration**.
- Choose **Web** as the application type.
- In **Redirect URIs**, set:
  - For local development: `http://localhost:3000/api/auth/callback/microsoft`
  - For production: your deployed application's URL, e.g. `https://example.com/api/auth/callback/microsoft`
- If you change the base path of your authentication routes, update the redirect URL accordingly.
- Add your credentials to your `.env` file:

  ```text
  MICROSOFT_CLIENT_ID=your_client_id
  MICROSOFT_CLIENT_SECRET=your_client_secret
  MICROSOFT_TENANT_ID=your_tenant_id # Optional
  ```

### Get your Okta credentials

To use Okta as a social provider, create an OIDC app integration in the Okta Admin Console.

- In Okta Admin, go to **Applications > Applications** and click **Create App Integration**.
- Choose **Sign-in method: OIDC - OpenID Connect** and **Application type: Web Application**.
- In **Sign-in redirect URIs**, set:
  - For local development: `http://localhost:3000/api/auth/callback/okta`
  - For production: `https://your-domain.com/api/auth/callback/okta`
- After creation, copy:
  - Your **Okta domain/issuer** (e.g. `https://dev-XXXX.okta.com/oauth2/default`). Use this as `OKTA_ISSUER`.
  - **Client ID** and **Client Secret**.
- Add your credentials to your `.env` file:

  ```text
  OKTA_CLIENT_ID=your_okta_client_id
  OKTA_CLIENT_SECRET=your_okta_client_secret
  # Full issuer URL, e.g. https://dev-XXXX.okta.com/oauth2/default
  OKTA_ISSUER=https://your-okta-domain/oauth2/default
  ```

## Environment Variable Check

Make sure your `.env` file contains the following variables:

```text
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
# Set to 1 to force account selection
GOOGLE_FORCE_ACCOUNT_SELECTION=1

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Microsoft
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
# Optional Tenant Id
MICROSOFT_TENANT_ID=your_microsoft_tenant_id
# Set to 1 to force account selection
MICROSOFT_FORCE_ACCOUNT_SELECTION=1


# Okta
OKTA_CLIENT_ID=your_okta_client_id
OKTA_CLIENT_SECRET=your_okta_client_secret
# Full issuer URL (e.g. https://dev-XXXX.okta.com/oauth2/default)
OKTA_ISSUER=https://your-okta-domain/oauth2/default

```

## Additional Configuration Options

### Authentication Settings

```text
# Disable email/password sign-in (optional)
DISABLE_EMAIL_SIGN_IN=1

# Disable new user sign-ups (optional)
DISABLE_SIGN_UP=1
```

### Base URL Configuration

For OAuth to work correctly, you must set the `BETTER_AUTH_URL` environment variable to match how you access the application:

```text
# For local development with HTTPS
BETTER_AUTH_URL=https://localhost:3000

# For local development with HTTP (default)
BETTER_AUTH_URL=http://localhost:3000

# For production
BETTER_AUTH_URL=https://yourdomain.com
```

**Important:** If you're using HTTPS locally (e.g., via a reverse proxy or custom SSL setup), make sure to set `BETTER_AUTH_URL=https://localhost:3000` to ensure OAuth callbacks work correctly.

## Done

You can now sign in to better-chatbot using your Google, GitHub, Microsoft, or Okta account. Restart the application to apply the changes.
