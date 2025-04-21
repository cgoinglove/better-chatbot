# GitHub Integration Setup

This document provides instructions on how to set up GitHub OAuth integration for the application.

## Prerequisites

- A GitHub account
- Access to create OAuth applications in GitHub

## Step 1: Create a GitHub OAuth Application

1. Go to your GitHub account settings
2. Navigate to "Developer settings" > "OAuth Apps" > "New OAuth App"
3. Fill in the application details:
   - **Application name**: Your application name (e.g., "MCP Client")
   - **Homepage URL**: Your application's homepage URL (e.g., `http://localhost:3000`)
   - **Application description**: A brief description of your application
   - **Authorization callback URL**: The callback URL for GitHub OAuth (e.g., `http://localhost:3000/api/github/callback`)
4. Click "Register application"

## Step 2: Generate a Client Secret

1. After registering the application, you'll be redirected to the application settings
2. Click "Generate a new client secret"
3. Copy the generated client secret (you won't be able to see it again)

## Step 3: Configure Environment Variables

1. Create a `.env.local` file in the root of your project (or edit the existing one)
2. Add the following environment variables:

```
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret

# GitHub Repository Storage
GITHUB_REPOS_DIR=./github-repos
```

3. Replace `your_github_client_id` and `your_github_client_secret` with the values from your GitHub OAuth application
4. Replace `your_github_webhook_secret` with a secure random string (this will be used for webhook verification)

## Step 4: Restart the Application

1. Save the `.env.local` file
2. Restart the application to apply the changes

## Testing the Integration

1. Navigate to the GitHub page in the application
2. Click "Connect GitHub Account"
3. You should be redirected to GitHub to authorize the application
4. After authorization, you should be redirected back to the application with your GitHub account connected

## Troubleshooting

If you encounter any issues with the GitHub integration, check the following:

- Ensure the environment variables are correctly set in `.env.local`
- Verify that the callback URL in your GitHub OAuth application matches the one in your environment variables
- Check the application logs for any error messages
- Make sure your GitHub account has the necessary permissions for the requested scopes

## Additional Configuration

### Webhooks

To enable webhooks for repository synchronization:

1. Set a secure random string as `GITHUB_WEBHOOK_SECRET` in your environment variables
2. Configure webhooks in your GitHub repositories to point to `http://your-app-url/api/github/webhook`
3. Set the webhook secret to match the `GITHUB_WEBHOOK_SECRET` value
4. Select the events you want to receive (at minimum: `push` and `pull_request`)
