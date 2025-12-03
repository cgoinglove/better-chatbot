import SignUpPage from "@/components/auth/sign-up";
import { getAuthConfig } from "auth/config";
import { getIsFirstUser } from "lib/auth/server";
import { redirect } from "next/navigation";

export default async function SignUp() {
  const isFirstUser = await getIsFirstUser();
  const {
    emailAndPasswordEnabled,
    socialAuthenticationProviders,
    signUpEnabled,
  } = getAuthConfig();

  if (!signUpEnabled) {
    redirect("/sign-in");
  }

  const enabledProviders = (
    Object.keys(
      socialAuthenticationProviders,
    ) as (keyof typeof socialAuthenticationProviders)[]
  ).filter((key) => socialAuthenticationProviders[key]);

  if (emailAndPasswordEnabled && enabledProviders.length === 0) {
    redirect("/sign-up/email");
  }

  return (
    <SignUpPage
      isFirstUser={isFirstUser}
      emailAndPasswordEnabled={emailAndPasswordEnabled}
      socialAuthenticationProviders={enabledProviders}
    />
  );
}
