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
import { cn } from "lib/utils";
import { ChevronLeft, Loader } from "lucide-react";
import { toast } from "sonner";
import { safe, watchError } from "ts-safe";
import { UserZodSchema } from "app-types/user";
import { existsByEmailAction, registerAction } from "@/app/api/auth/actions";
import { handleErrorWithToast } from "ui/shared-toast";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useObjectState({
    email: "",
    name: "",
    password: "",
  });

  const steps = [
    "Start your journey with us by entering your email address",
    "I'll use this name when we chat",
    "Create a strong password to secure your account",
  ];

  const safeProcessWithLoading = function <T>(fn: () => Promise<T>) {
    setIsLoading(true);
    return safe(() => fn()).watch(() => setIsLoading(false));
  };

  const backStep = () => {
    setStep(Math.max(step - 1, 1));
  };

  const successEmailStep = async () => {
    const { success } = UserZodSchema.shape.email.safeParse(formData.email);
    if (!success) {
      toast.error("Invalid email address");
      return;
    }
    const exists = await safeProcessWithLoading(() =>
      existsByEmailAction(formData.email),
    ).orElse(false);
    if (exists) {
      toast.error("Email already exists");
      return;
    }
    setStep(2);
  };

  const successNameStep = () => {
    const { success } = UserZodSchema.shape.name.safeParse(formData.name);
    if (!success) {
      toast.error("Name is required");
      return;
    }
    setStep(3);
  };

  const successPasswordStep = async () => {
    const { success } = UserZodSchema.shape.password.safeParse(
      formData.password,
    );
    if (!success) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    const user = await safeProcessWithLoading(() =>
      registerAction({
        ...formData,
        image: null,
        plainPassword: formData.password,
      }),
    )
      .watch(watchError(handleErrorWithToast))
      .unwrap();
    if (user) {
      toast.success("Account created successfully");
      router.push("/login");
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 justify-center relative">
      <div className="w-full flex justify-end absolute top-0 right-0">
        <Link href="/login">
          <Button variant="ghost">Login</Button>
        </Link>
      </div>
      <Card className="w-full md:max-w-md bg-background border-none mx-auto gap-0">
        <CardHeader>
          <CardTitle className="text-2xl text-center ">
            Create an account
          </CardTitle>
          <CardDescription className="py-12">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground text-right">
                Step {step} of {steps.length}
              </p>
              <div className="h-2 w-full relative bg-input">
                <div
                  style={{
                    width: `${(step / 3) * 100}%`,
                  }}
                  className="h-full bg-primary transition-all duration-300"
                ></div>
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {step === 1 && (
              <div className={cn("flex flex-col gap-2")}>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mcp@example.com"
                  disabled={isLoading}
                  autoFocus
                  value={formData.email}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      e.nativeEvent.isComposing === false
                    ) {
                      successEmailStep();
                    }
                  }}
                  onChange={(e) => setFormData({ email: e.target.value })}
                  required
                />
              </div>
            )}
            {step === 2 && (
              <div className={cn("flex flex-col gap-2")}>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Cgoing"
                  disabled={isLoading}
                  autoFocus
                  value={formData.name}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      e.nativeEvent.isComposing === false
                    ) {
                      successNameStep();
                    }
                  }}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  required
                />
              </div>
            )}
            {step === 3 && (
              <div className={cn("flex flex-col gap-2")}>
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  disabled={isLoading}
                  autoFocus
                  value={formData.password}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      e.nativeEvent.isComposing === false
                    ) {
                      successPasswordStep();
                    }
                  }}
                  onChange={(e) => setFormData({ password: e.target.value })}
                  required
                />
              </div>
            )}
            <p className="text-muted-foreground text-xs mb-6">
              {steps[step - 1]}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={isLoading}
                className={cn(step === 1 && "opacity-0", "w-1/2")}
                variant="ghost"
                onClick={backStep}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button
                disabled={isLoading}
                className="w-1/2"
                onClick={() => {
                  if (step === 1) successEmailStep();
                  if (step === 2) successNameStep();
                  if (step === 3) successPasswordStep();
                }}
              >
                {step === 3 ? "Create account" : "Next"}
                {isLoading && <Loader className="size-4 ml-2" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
