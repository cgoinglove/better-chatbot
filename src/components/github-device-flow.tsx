"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Button } from "ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "ui/card";
import { Github, RefreshCw, Check, Copy, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";

interface GitHubDeviceFlowProps {
  onAuthComplete?: () => void;
}

export function GitHubDeviceFlow({ onAuthComplete }: GitHubDeviceFlowProps) {
  const [step, setStep] = useState<"start" | "verify" | "polling" | "complete">("start");
  const [isLoading, setIsLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    deviceCode: string;
    interval: number;
  } | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [expiryTimer, setExpiryTimer] = useState<number | null>(null);

  // Start the device flow
  const handleStartDeviceFlow = async () => {
    setIsLoading(true);

    try {
      // Request device code
      const response = await fetch("/api/github/device");

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to start GitHub device flow");
      }

      const data = await response.json();

      if (data.success) {
        setDeviceInfo(data);
        setStep("verify");
        
        // Start expiry timer
        setExpiryTimer(data.expiresIn);
      } else {
        throw new Error(data.message || "Failed to start GitHub device flow");
      }
    } catch (error) {
      console.error("Error starting GitHub device flow:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start GitHub device flow"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Start polling for authentication completion
  const handleStartPolling = async () => {
    if (!deviceInfo) return;
    
    setStep("polling");
    setPollAttempts(0);

    try {
      // Poll for authentication completion
      const response = await fetch("/api/github/device/poll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceCode: deviceInfo.deviceCode,
          interval: deviceInfo.interval,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to complete GitHub authentication");
      }

      const data = await response.json();

      if (data.success) {
        setStep("complete");
        toast.success("GitHub account connected successfully");
        onAuthComplete?.();
      } else {
        throw new Error(data.message || "Failed to complete GitHub authentication");
      }
    } catch (error) {
      console.error("Error completing GitHub authentication:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to complete GitHub authentication"
      );
      setStep("verify"); // Go back to verify step
    }
  };

  // Copy user code to clipboard
  const handleCopyCode = () => {
    if (!deviceInfo) return;
    
    navigator.clipboard.writeText(deviceInfo.userCode);
    toast.success("Code copied to clipboard");
  };

  // Open verification URL in a new tab
  const handleOpenVerificationUrl = () => {
    if (!deviceInfo) return;
    
    window.open(deviceInfo.verificationUri, "_blank");
  };

  // Update expiry timer
  useEffect(() => {
    if (expiryTimer === null) return;
    
    const interval = setInterval(() => {
      setExpiryTimer((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [expiryTimer]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Github className="mr-2 h-5 w-5" />
          GitHub Device Authentication
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="start" disabled={isLoading || step !== "start"}>
              Start
            </TabsTrigger>
            <TabsTrigger
              value="verify"
              disabled={isLoading || !["verify", "polling", "complete"].includes(step)}
            >
              Verify
            </TabsTrigger>
            <TabsTrigger
              value="polling"
              disabled={isLoading || !["polling", "complete"].includes(step)}
            >
              Polling
            </TabsTrigger>
            <TabsTrigger
              value="complete"
              disabled={isLoading || step !== "complete"}
            >
              Complete
            </TabsTrigger>
          </TabsList>

          <TabsContent value="start" className="space-y-4 mt-4">
            <Alert>
              <AlertTitle>GitHub Device Authentication</AlertTitle>
              <AlertDescription>
                <p>
                  This method allows you to connect your GitHub account without
                  using the standard OAuth flow. You'll receive a code to enter
                  on GitHub's website.
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center py-8">
              <Button onClick={handleStartDeviceFlow} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    Start GitHub Authentication
                    <Github className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="verify" className="space-y-4 mt-4">
            {deviceInfo && (
              <>
                <Alert>
                  <AlertTitle>Enter Code on GitHub</AlertTitle>
                  <AlertDescription>
                    <p>
                      Go to{" "}
                      <a
                        href={deviceInfo.verificationUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {deviceInfo.verificationUri}
                      </a>{" "}
                      and enter the following code:
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-3xl font-mono font-bold tracking-widest bg-muted p-4 rounded-md">
                      {deviceInfo.userCode}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyCode}
                      title="Copy code"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={handleOpenVerificationUrl}
                      className="flex items-center"
                    >
                      Open GitHub Verification Page
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {expiryTimer !== null && expiryTimer > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Code expires in {formatTimeRemaining(expiryTimer)}
                    </p>
                  )}
                  {expiryTimer !== null && expiryTimer <= 0 && (
                    <p className="text-sm text-destructive">
                      Code has expired. Please start over.
                    </p>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="polling" className="space-y-4 mt-4">
            <Alert>
              <AlertTitle>Waiting for GitHub Authentication</AlertTitle>
              <AlertDescription>
                <p>
                  We're waiting for you to complete the authentication on GitHub.
                  This page will automatically update when you're done.
                </p>
                <p className="mt-2">
                  Poll attempts: {pollAttempts}
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <RefreshCw className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Waiting for GitHub authentication to complete...
              </p>
            </div>
          </TabsContent>

          <TabsContent value="complete" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-medium">Authentication Complete!</h3>
              <p className="text-center text-muted-foreground">
                Your GitHub account has been successfully connected.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {step === "verify" && deviceInfo && (
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleStartPolling}
            disabled={isLoading || (expiryTimer !== null && expiryTimer <= 0)}
          >
            I've entered the code on GitHub
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
