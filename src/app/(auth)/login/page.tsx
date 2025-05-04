"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useObjectState } from "@/hooks/use-object-state";
import { loginAction } from "@/app/api/auth/actions";
import { useSession } from "next-auth/react";

import { Loader } from "lucide-react";
import { safe, watchError } from "ts-safe";
import { handleErrorWithToast } from "ui/shared-toast";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useObjectState({
    email: "",
    password: "",
  });

  const { update } = useSession();
  const router = useRouter();

  const login = () => {
    setLoading(true);
    safe(() => loginAction(formData))
      .watch(watchError(handleErrorWithToast))
      .watch(() => setLoading(false))
      .ifOk(() => update())
      .ifOk(() => router.push("/"))
      .unwrap();
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 justify-center">
      <Card className="w-full md:max-w-md bg-background border-none mx-auto ">
        <CardHeader className="my-4">
          <CardTitle className="text-2xl text-center my-1">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                autoFocus
                disabled={loading}
                value={formData.email}
                onChange={(e) => setFormData({ email: e.target.value })}
                type="email"
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                disabled={loading}
                value={formData.password}
                placeholder="********"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    login();
                  }
                }}
                onChange={(e) => setFormData({ password: e.target.value })}
                type="password"
                required
              />
            </div>
            <Button className="w-full" onClick={login} disabled={loading}>
              {loading ? (
                <Loader className="size-4 animate-spin ml-1" />
              ) : (
                "Login"
              )}
            </Button>
          </div>
          <div className="my-8 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
