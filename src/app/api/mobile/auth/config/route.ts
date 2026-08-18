import { getIsFirstUser } from "auth/server";
import { getAuthConfig } from "lib/auth/config";
import { BASE_URL } from "lib/const";

export async function GET() {
  const config = getAuthConfig();
  const providers = config.socialAuthenticationProviders;

  return Response.json({
    baseUrl: BASE_URL,
    authBasePath: "/api/auth",
    emailAndPasswordEnabled: config.emailAndPasswordEnabled,
    signUpEnabled: config.signUpEnabled,
    isFirstUser: await getIsFirstUser(),
    socialProviders: {
      github: Boolean(providers.github),
      google: Boolean(providers.google),
      microsoft: Boolean(providers.microsoft),
    },
  });
}
