## Social Login Setup (Google & GitHub, English)

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

## Environment Variable Check

Make sure your `.env` file contains the following variables:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

## Done

You can now sign in to better-chatbot using your Google or GitHub account. Restart the application to apply the changes. 