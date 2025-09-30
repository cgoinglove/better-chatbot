import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import LightRays from "ui/light-rays";

const convertErrorToMessage = (error: string) => {
  switch (error) {
    case "signup_disabled":
      return "Signup is disabled";
    case "UNAUTHORIZED":
      return "Authentication required";
    default:
      return error;
  }
};

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="w-full h-screen flex items-center justify-center relative">
      <div className="absolute inset-0 w-full h-full">
        <LightRays />
      </div>
      <Card className="w-sm z-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Auth Error</CardTitle>
          <CardDescription>
            {convertErrorToMessage(error ?? "Unknown error")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant={"link"}>Go to home</Button>
        </CardContent>
      </Card>
    </div>
  );
}
