import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import LightRays from "ui/light-rays";
import { getTranslations } from "next-intl/server";

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const t = await getTranslations("Auth.Error");

  const convertErrorToMessage = (error: string) => {
    switch (error) {
      case "signup_disabled":
        return t("signupDisabled");
      case "UNAUTHORIZED":
        return t("unauthorized");
      default:
        return error;
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center relative">
      <div className="absolute inset-0 w-full h-full">
        <LightRays />
      </div>
      <Card className="w-sm z-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("title")}
          </CardTitle>
          <CardDescription>
            {convertErrorToMessage(error ?? t("unknownError"))}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link
            className="text-sm text-muted-foreground text-center underline"
            href="/"
          >
            {t("goToHome")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
