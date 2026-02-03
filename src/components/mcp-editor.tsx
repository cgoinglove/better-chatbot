"use client";
import { useState, useMemo } from "react";
import {
  MCPServerConfig,
  MCPRemoteConfigZodSchema,
  MCPStdioConfigZodSchema,
  McpAuthProvider,
  McpAuthConfig,
} from "app-types/mcp";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import JsonView from "./ui/json-view";
import { toast } from "sonner";
import { safe } from "ts-safe";
import { useRouter } from "next/navigation";
import { createDebounce, fetcher, isNull, safeJSONParse } from "lib/utils";
import { handleErrorWithToast } from "ui/shared-toast";
import { mutate } from "swr";
import { Loader, ShieldCheck, Info } from "lucide-react";
import {
  isMaybeMCPServerConfig,
  isMaybeRemoteConfig,
} from "lib/ai/mcp/is-mcp-config";

import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { existMcpClientByServerNameAction } from "@/app/api/mcp/actions";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface MCPEditorProps {
  initialConfig?: MCPServerConfig;
  name?: string;
  id?: string;
  initialUserSessionAuth?: boolean;
  initialRequiresAuth?: boolean;
  initialAuthProvider?: McpAuthProvider;
  initialAuthConfig?: McpAuthConfig;
}

const STDIO_ARGS_ENV_PLACEHOLDER = `/** STDIO Example */
{
  "command": "node", 
  "args": ["index.js"],
  "env": {
    "OPENAI_API_KEY": "sk-...",
  }
}

/** SSE,Streamable HTTP Example */
{
  "url": "https://api.example.com",
  "headers": {
    "Authorization": "Bearer sk-..."
  }
}`;

export default function MCPEditor({
  initialConfig,
  name: initialName,
  id,
  initialUserSessionAuth = false,
  initialRequiresAuth = false,
  initialAuthProvider = "none",
  initialAuthConfig,
}: MCPEditorProps) {
  const t = useTranslations();
  const shouldInsert = useMemo(() => isNull(id), [id]);

  const [isLoading, setIsLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const errorDebounce = useMemo(() => createDebounce(), []);

  // State for form fields
  const [name, setName] = useState<string>(initialName ?? "");
  const router = useRouter();
  const [config, setConfig] = useState<MCPServerConfig>(
    initialConfig as MCPServerConfig,
  );
  const [jsonString, setJsonString] = useState<string>(
    initialConfig ? JSON.stringify(initialConfig, null, 2) : "",
  );

  // User Session Authorization - enables per-user session isolation
  const [userSessionAuth, setUserSessionAuth] = useState(
    initialUserSessionAuth,
  );

  // Authentication configuration state (admin-configured auth)
  const [requiresAuth, setRequiresAuth] = useState(initialRequiresAuth);
  const [authProvider, setAuthProvider] =
    useState<McpAuthProvider>(initialAuthProvider);
  const [authConfig, setAuthConfig] = useState<McpAuthConfig>(
    initialAuthConfig || {},
  );
  const [authConfigOpen, setAuthConfigOpen] = useState(initialRequiresAuth);

  // Name validation schema
  const nameSchema = z.string().regex(/^[a-zA-Z0-9\-]+$/, {
    message: t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens"),
  });

  const validateName = (nameValue: string): boolean => {
    const result = nameSchema.safeParse(nameValue);
    if (!result.success) {
      setNameError(
        t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens"),
      );
      return false;
    }
    setNameError(null);
    return true;
  };

  const saveDisabled = useMemo(() => {
    return (
      name.trim() === "" ||
      isLoading ||
      !!jsonError ||
      !!nameError ||
      !isMaybeMCPServerConfig(config)
    );
  }, [isLoading, jsonError, nameError, config, name]);

  // Validate
  const validateConfig = (jsonConfig: unknown): boolean => {
    const result = isMaybeRemoteConfig(jsonConfig)
      ? MCPRemoteConfigZodSchema.safeParse(jsonConfig)
      : MCPStdioConfigZodSchema.safeParse(jsonConfig);
    if (!result.success) {
      handleErrorWithToast(result.error, "mcp-editor-error");
    }
    return result.success;
  };

  // Handle save button click
  const handleSave = async () => {
    // Perform validation
    if (!validateConfig(config)) return;
    if (!name) {
      return handleErrorWithToast(
        new Error(t("MCP.nameIsRequired")),
        "mcp-editor-error",
      );
    }

    if (!validateName(name)) {
      return handleErrorWithToast(
        new Error(t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens")),
        "mcp-editor-error",
      );
    }

    safe(() => setIsLoading(true))
      .map(async () => {
        if (shouldInsert) {
          const exist = await existMcpClientByServerNameAction(name);
          if (exist) {
            throw new Error(t("MCP.nameAlreadyExists"));
          }
        }
      })
      .map(() =>
        fetcher("/api/mcp", {
          method: "POST",
          body: JSON.stringify({
            name,
            config,
            id,
            userSessionAuth,
            requiresAuth,
            authProvider: requiresAuth ? authProvider : "none",
            authConfig:
              requiresAuth && authProvider !== "none" ? authConfig : undefined,
          }),
        }),
      )
      .ifOk(() => {
        toast.success(t("MCP.configurationSavedSuccessfully"));
        mutate("/api/mcp/list");
        router.push("/mcp");
      })
      .ifFail(handleErrorWithToast)
      .watch(() => setIsLoading(false));
  };

  const handleConfigChange = (data: string) => {
    setJsonString(data);
    const result = safeJSONParse(data);
    errorDebounce.clear();
    if (result.success) {
      setConfig(result.value as MCPServerConfig);
      setJsonError(null);
    } else if (data.trim() !== "") {
      errorDebounce(() => {
        setJsonError(
          (result.error as Error)?.message ??
            JSON.stringify(result.error, null, 2),
        );
      }, 1000);
    }
  };

  return (
    <>
      <div className="flex flex-col space-y-6">
        {/* Name field */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>

          <Input
            id="name"
            value={name}
            disabled={!shouldInsert}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value) validateName(e.target.value);
            }}
            placeholder={t("MCP.enterMcpServerName")}
            className={nameError ? "border-destructive" : ""}
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config">Config</Label>
          </div>

          {/* Split view for config editor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left side: Textarea for editing */}
            <div className="space-y-2">
              <Textarea
                id="config-editor"
                value={jsonString}
                onChange={(e) => handleConfigChange(e.target.value)}
                data-testid="mcp-config-editor"
                className="font-mono h-[40vh] resize-none overflow-y-auto"
                placeholder={STDIO_ARGS_ENV_PLACEHOLDER}
              />
            </div>

            {/* Right side: JSON view */}
            <div className="space-y-2 hidden sm:block">
              <div className="border border-input rounded-md p-4 h-[40vh] overflow-auto relative bg-secondary">
                <Label
                  htmlFor="config-view"
                  className="text-xs text-muted-foreground mb-2"
                >
                  preview
                </Label>
                <JsonView
                  data={config}
                  initialExpandDepth={3}
                  data-testid="mcp-config-view"
                />
                {jsonError && jsonString && (
                  <div className="absolute w-full bottom-0 right-0 px-2 pb-2 animate-in fade-in-0 duration-300">
                    <Alert variant="destructive" className="border-destructive">
                      <AlertTitle className="text-xs font-semibold">
                        Parsing Error
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {jsonError}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Session Authorization */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <Label htmlFor="user-session-auth" className="font-medium">
                User Session Authorization
              </Label>
            </div>
            <Switch
              id="user-session-auth"
              checked={userSessionAuth}
              onCheckedChange={setUserSessionAuth}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enable user session isolation for this MCP server. Each user will
            maintain their own authorization session, ensuring proper access
            governance and session isolation.
          </p>
        </div>

        {/* Admin-Configured Authentication */}
        <Collapsible open={authConfigOpen} onOpenChange={setAuthConfigOpen}>
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <Label htmlFor="requires-auth" className="font-medium">
                  Admin-Configured Authentication
                </Label>
              </div>
              <Switch
                id="requires-auth"
                checked={requiresAuth}
                onCheckedChange={(checked) => {
                  setRequiresAuth(checked);
                  setAuthConfigOpen(checked);
                  if (!checked) {
                    setAuthProvider("none");
                  } else if (authProvider === "none") {
                    setAuthProvider("okta");
                  }
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Configure a specific identity provider (Okta, OAuth2) for this MCP
              server. Users must authenticate before accessing tools.
            </p>

            <CollapsibleContent className="space-y-4 pt-2">
              {requiresAuth && (
                <>
                  {/* Auth Provider Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="auth-provider">
                      Authentication Provider
                    </Label>
                    <Select
                      value={authProvider}
                      onValueChange={(value) =>
                        setAuthProvider(value as McpAuthProvider)
                      }
                    >
                      <SelectTrigger id="auth-provider">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="okta">Okta</SelectItem>
                        <SelectItem value="oauth2">
                          Generic OAuth 2.0
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Okta Configuration */}
                  {authProvider === "okta" && (
                    <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Info className="size-3" />
                        <span>Configure your Okta application settings</span>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="okta-issuer">Okta Issuer URL</Label>
                        <Input
                          id="okta-issuer"
                          value={authConfig.issuer || ""}
                          onChange={(e) =>
                            setAuthConfig({
                              ...authConfig,
                              issuer: e.target.value,
                            })
                          }
                          placeholder="https://your-domain.okta.com"
                        />
                        <p className="text-xs text-muted-foreground">
                          Your Okta domain (e.g., https://dev-123456.okta.com)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="okta-client-id">Client ID</Label>
                        <Input
                          id="okta-client-id"
                          value={authConfig.clientId || ""}
                          onChange={(e) =>
                            setAuthConfig({
                              ...authConfig,
                              clientId: e.target.value,
                            })
                          }
                          placeholder="0oa..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="okta-scopes">
                          Scopes (comma-separated)
                        </Label>
                        <Input
                          id="okta-scopes"
                          value={
                            authConfig.scopes?.join(", ") ||
                            "openid, profile, email"
                          }
                          onChange={(e) =>
                            setAuthConfig({
                              ...authConfig,
                              scopes: e.target.value
                                .split(",")
                                .map((s) => s.trim()),
                            })
                          }
                          placeholder="openid, profile, email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="okta-audience">
                          Audience (optional)
                        </Label>
                        <Input
                          id="okta-audience"
                          value={authConfig.audience || ""}
                          onChange={(e) =>
                            setAuthConfig({
                              ...authConfig,
                              audience: e.target.value,
                            })
                          }
                          placeholder="api://default"
                        />
                      </div>
                    </div>
                  )}

                  {/* Generic OAuth2 Info */}
                  {authProvider === "oauth2" && (
                    <Alert>
                      <Info className="size-4" />
                      <AlertTitle>Generic OAuth 2.0</AlertTitle>
                      <AlertDescription>
                        For generic OAuth 2.0, the MCP server itself must
                        provide the OAuth endpoints. The chatbot will discover
                        them automatically when connecting.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Save button */}
        <Button onClick={handleSave} className="w-full" disabled={saveDisabled}>
          {isLoading ? (
            <Loader className="size-4 animate-spin" />
          ) : (
            <span className="font-bold">{t("MCP.saveConfiguration")}</span>
          )}
        </Button>
      </div>
    </>
  );
}
