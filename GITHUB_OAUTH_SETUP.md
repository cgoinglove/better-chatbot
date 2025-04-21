# Setting Up GitHub OAuth in Next.js

This guide provides detailed instructions on how to set up GitHub OAuth integration for your Next.js application.

## Step 1: Create a GitHub OAuth Application

1. Go to your GitHub account settings
2. Navigate to "Developer settings" > "OAuth Apps" > "New OAuth App"
3. Fill in the application details:
   - **Application name**: Your application name (e.g., "MCP Client")
   - **Homepage URL**: `http://localhost:3000` (for local development)
   - **Application description**: A brief description of your application
   - **Authorization callback URL**: `http://localhost:3000/api/github/callback`
4. Click "Register application"
5. After registering, you'll see your Client ID
6. Click "Generate a new client secret" and copy the generated secret

## Step 2: Configure Environment Variables in Next.js

### Option 1: Using .env.local file (recommended for development)

1. Create a `.env.local` file in the root of your project:

```
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# GitHub Repository Storage
GITHUB_REPOS_DIR=./github-repos
```

2. Replace the placeholder values with your actual GitHub OAuth credentials
3. Make sure `.env.local` is in your `.gitignore` file to keep your secrets secure

### Option 2: Using Environment Variables in Production

For production environments, set the environment variables according to your hosting platform:

- **Vercel**: Set environment variables in the Vercel dashboard
- **Netlify**: Set environment variables in the Netlify dashboard
- **Docker**: Set environment variables in your Docker configuration
- **Other platforms**: Refer to your hosting platform's documentation

## Step 3: Restart Your Next.js Application

For the environment variables to take effect, you need to restart your Next.js application:

```bash
# Stop the current instance (if running)
# Then start it again
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Step 4: Verify the Configuration

1. Check your application logs for the GitHub OAuth configuration status
2. You should see a message indicating that the Client ID and Client Secret are set
3. If you see any errors, double-check your environment variables

## Step 5: Test the GitHub OAuth Flow

1. Navigate to the GitHub page in your application
2. Click "Connect GitHub Account"
3. You should be redirected to GitHub's authorization page
4. After authorizing, you should be redirected back to your application

## Troubleshooting

### Common Issues

1. **"GitHub Client ID is not configured"**
   - Make sure you've created the `.env.local` file
   - Ensure the `GITHUB_CLIENT_ID` variable is set correctly
   - Restart your Next.js application

2. **"GitHub Client ID is set to the placeholder value"**
   - Replace `your_github_client_id` with your actual GitHub OAuth App client ID
   - Restart your Next.js application

3. **Redirect URI Mismatch**
   - Ensure the redirect URI in your GitHub OAuth App settings matches the one in your environment variables
   - The default is `http://localhost:3000/api/github/callback` for local development

4. **"Application has not been set up"**
   - This error from GitHub means your OAuth App is not properly configured
   - Double-check all settings in your GitHub OAuth App

### Debugging

To debug environment variable issues, you can add temporary logging to your code:

```javascript
// Add this to a server component or API route
console.log('GitHub OAuth Config:', {
  clientId: process.env.GITHUB_CLIENT_ID ? 'Set' : 'Not set',
  clientSecret: process.env.GITHUB_CLIENT_SECRET ? 'Set' : 'Not set',
  redirectUri: process.env.GITHUB_REDIRECT_URI
});
```

## Next Steps

After successfully setting up GitHub OAuth:

1. Implement repository access and management
2. Set up webhooks for real-time updates
3. Implement pull request and code review features
4. Add commit history viewing

## Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Next.js Environment Variables Documentation](https://nextjs.org/docs/basic-features/environment-variables)
- [OAuth 2.0 Specification](https://oauth.net/2/)
