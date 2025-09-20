"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "lib/utils";
import { useTranslations } from "next-intl";
import { SocialAuthenticationProvider } from "app-types/authentication";
import SocialProviders from "./social-providers";
import { Mail } from "lucide-react";
import { authClient } from "auth/client";
import { toast } from "sonner";
import { startTransition } from "react";

export default function SignUpPage({
  emailAndPasswordEnabled,
  socialAuthenticationProviders,
  isFirstUser,
}: {
  emailAndPasswordEnabled: boolean;
  socialAuthenticationProviders: SocialAuthenticationProvider[];
  isFirstUser: boolean;
}) {
  const t = useTranslations();
  const handleSocialSignIn = (provider: SocialAuthenticationProvider) => {
    startTransition(async () => {
      try {
        await authClient.signIn.social({ provider });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Unknown error");
      }
    });
  };
  return (
    <Card className="w-full md:max-w-md bg-background border-none mx-auto shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl text-center ">
          {isFirstUser ? t("Auth.SignUp.titleAdmin") : t("Auth.SignUp.title")}
        </CardTitle>
        <CardDescription className="text-center">
          {isFirstUser
            ? t("Auth.SignUp.signUpDescriptionAdmin")
            : t("Auth.SignUp.signUpDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {emailAndPasswordEnabled && (
          <Link
            href="/sign-up/email"
            data-testid="email-signup-button"
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
          >
            <Mail className="size-4" />
            {t("Auth.SignUp.email")}
          </Link>
        )}
        {socialAuthenticationProviders.length > 0 && (
          <>
            {emailAndPasswordEnabled && (
              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-accent"></div>
                <span className="px-4 text-sm text-muted-foreground">
                  {t("Auth.SignIn.orContinueWith")}
                </span>
                <div className="flex-1 h-px bg-accent"></div>
              </div>
            )}
            <SocialProviders
              socialAuthenticationProviders={socialAuthenticationProviders}
              onSocialProviderClick={handleSocialSignIn}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
