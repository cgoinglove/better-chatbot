"use client";

import { ExternalLink, Github, Settings, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Dialog, DialogContent, DialogTrigger } from "ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { GitHubDeviceFlow } from "./github-device-flow";
import { GitHubSetupWizard } from "./github-setup-wizard";

export function GitHubConnectCard() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showDeviceFlow, setShowDeviceFlow] = useState(false);
  const [authMethod, setAuthMethod] = useState<"web" | "device">("web");

  // Check if GitHub is configured
  useEffect(() => {
    const checkGitHubConfig = async () => {
      setIsCheckingConfig(true);
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
            console.error("Failed to create GitHub config table");
          } else {
            // Wait a moment for the table to be created
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        // Test the GitHub connection
        const response = await fetch("/api/github/test-connection");

        if (response.ok) {
          const data = await response.json();
          // Check if we have a valid configuration
          setIsConfigured(true);
        } else {
          setIsConfigured(false);
        }
      } catch (error) {
        console.error("Error checking GitHub configuration:", error);
        setIsConfigured(false);
      } finally {
        setIsCheckingConfig(false);
      }
    };

    checkGitHubConfig();
  }, []);

  const handleConnect = () => {
    if (authMethod === "web") {
      setIsConnecting(true);

      // Directly navigate to the GitHub auth endpoint
      // The server will handle the redirect to GitHub
      window.location.href = "/api/github/auth";

      // Note: We don't reset isConnecting because we're navigating away from this page
    } else {
      // Show device flow dialog
      setShowDeviceFlow(true);
    }
  };

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    setIsConfigured(true);
    toast.success(
      "GitHub setup completed successfully. Please restart the application for changes to take effect.",
    );
  };

  const handleDeviceAuthComplete = () => {
    setShowDeviceFlow(false);
    toast.success("GitHub account connected successfully");
    // Refresh the page to update the UI
    window.location.href = "/github";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect GitHub Account</CardTitle>
        <CardDescription>
          Link your GitHub account to access your repositories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-6">
          <Github className="h-16 w-16 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Connecting your GitHub account allows you to:
        </p>
        <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground">
          <li>Access your private repositories</li>
          <li>Clone repositories directly</li>
          <li>Search code across all your repositories</li>
          <li>Get personalized code suggestions</li>
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Tabs
          defaultValue="web"
          className="w-full"
          onValueChange={(value) => setAuthMethod(value as "web" | "device")}
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="web">
              <ExternalLink className="mr-2 h-4 w-4" />
              Web Flow
            </TabsTrigger>
            <TabsTrigger value="device">
              <Smartphone className="mr-2 h-4 w-4" />
              Device Flow
            </TabsTrigger>
          </TabsList>

          <TabsContent value="web" className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Standard OAuth flow that redirects to GitHub in your browser.
            </p>
            <Button
              className="w-full"
              onClick={handleConnect}
              disabled={isConnecting || !isConfigured || isCheckingConfig}
            >
              <Github className="mr-2 h-4 w-4" />
              {isConnecting
                ? "Connecting..."
                : isCheckingConfig
                  ? "Checking Configuration..."
                  : "Connect with Browser"}
            </Button>
          </TabsContent>

          <TabsContent value="device" className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Device flow that provides a code to enter on GitHub's website.
            </p>
            <Button
              className="w-full"
              onClick={handleConnect}
              disabled={isConnecting || !isConfigured || isCheckingConfig}
            >
              <Smartphone className="mr-2 h-4 w-4" />
              Connect with Device Code
            </Button>
          </TabsContent>
        </Tabs>

        {!isConfigured && (
          <Dialog open={showSetupWizard} onOpenChange={setShowSetupWizard}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Configure GitHub Integration
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <GitHubSetupWizard onSetupComplete={handleSetupComplete} />
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={showDeviceFlow} onOpenChange={setShowDeviceFlow}>
          <DialogContent className="sm:max-w-md">
            <GitHubDeviceFlow onAuthComplete={handleDeviceAuthComplete} />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
