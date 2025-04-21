"use client";

import { ArrowRight, Check, Github, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";

interface GitHubSetupWizardProps {
  onSetupComplete?: () => void;
}

export function GitHubSetupWizard({ onSetupComplete }: GitHubSetupWizardProps) {
  const [step, setStep] = useState<"credentials" | "testing" | "complete">(
    "credentials",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(
    "http://localhost:3000/api/github/callback",
  );

  const handleSaveCredentials = async () => {
    if (!clientId || !clientSecret) {
      toast.error("Please enter both Client ID and Client Secret");
      return;
    }

    setIsLoading(true);

    try {
      // Check if the GitHub config table exists
      const checkResponse = await fetch("/api/github/check-db");
      const checkResult = await checkResponse.json();

      // If the table doesn't exist, create it
      if (checkResponse.ok && checkResult.tableExists === false) {
        const createResponse = await fetch("/api/github/create-table", {
          method: "POST",
        });

        if (!createResponse.ok) {
          const error = await createResponse.text();
          throw new Error(error || "Failed to create GitHub config table");
        }

        // Wait a moment for the table to be created
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Save the credentials to the server
      const response = await fetch("/api/github/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
          redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to save GitHub credentials");
      }

      const result = await response.json();

      if (result.success) {
        toast.success("GitHub credentials saved successfully");
        setStep("testing");
      } else {
        throw new Error(result.message || "Failed to save GitHub credentials");
      }
    } catch (error) {
      console.error("Error saving GitHub credentials:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save GitHub credentials",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);

    try {
      // Test the GitHub connection
      const response = await fetch("/api/github/test-connection");

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to test GitHub connection");
      }

      const data = await response.json();

      toast.success("GitHub connection successful");
      setStep("complete");
      onSetupComplete?.();
    } catch (error) {
      console.error("Error testing GitHub connection:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to test GitHub connection",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Github className="mr-2 h-5 w-5" />
          GitHub Setup Wizard
        </CardTitle>
        <CardDescription>Configure your GitHub integration</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="credentials" disabled={isLoading}>
              Credentials
            </TabsTrigger>
            <TabsTrigger
              value="testing"
              disabled={step === "credentials" || isLoading}
            >
              Testing
            </TabsTrigger>
            <TabsTrigger
              value="complete"
              disabled={step !== "complete" || isLoading}
            >
              Complete
            </TabsTrigger>
          </TabsList>

          <TabsContent value="credentials" className="space-y-4 mt-4">
            <Alert>
              <AlertTitle>GitHub OAuth App Required</AlertTitle>
              <AlertDescription>
                <p>
                  You need to create a GitHub OAuth App to get your Client ID
                  and Client Secret. Follow these steps:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>
                    Go to{" "}
                    <a
                      href="https://github.com/settings/developers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      GitHub Developer Settings
                    </a>
                  </li>
                  <li>
                    Click "New OAuth App" (or "Register a new application")
                  </li>
                  <li>
                    Fill in the application details:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Application name: Your app name</li>
                      <li>
                        Homepage URL:{" "}
                        <code className="bg-muted px-1 py-0.5 rounded text-xs">
                          http://localhost:3000
                        </code>
                      </li>
                      <li>
                        Authorization callback URL:{" "}
                        <code className="bg-muted px-1 py-0.5 rounded text-xs">
                          http://localhost:3000/api/github/callback
                        </code>
                      </li>
                    </ul>
                  </li>
                  <li>Click "Register application"</li>
                  <li>Copy the Client ID and generate a Client Secret</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">GitHub Client ID</Label>
                <Input
                  id="clientId"
                  placeholder="e.g., 1234567890abcdef1234"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  This is the Client ID from your GitHub OAuth App, not your
                  email or username. It should look like a string of letters and
                  numbers.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">GitHub Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="e.g., 1234567890abcdef1234567890abcdef12345678"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="redirectUri">Redirect URI</Label>
                <Input
                  id="redirectUri"
                  placeholder="http://localhost:3000/api/github/callback"
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  This must match the callback URL in your GitHub OAuth App
                  settings
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4 mt-4">
            <Alert>
              <AlertTitle>Test Your GitHub Connection</AlertTitle>
              <AlertDescription>
                Click the button below to test your GitHub connection. This will
                verify that your credentials are working correctly.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center py-8">
              <Button onClick={handleTestConnection} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    Test GitHub Connection
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="complete" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-medium">Setup Complete!</h3>
              <p className="text-center text-muted-foreground">
                Your GitHub integration is now configured and ready to use.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {step === "credentials" && (
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleSaveCredentials}
            disabled={isLoading || !clientId || !clientSecret}
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save Credentials
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
