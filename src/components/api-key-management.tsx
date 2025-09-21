"use client";

import { useObjectState } from "@/hooks/use-object-state";
import { fetcher } from "lib/utils";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Key,
  Loader,
  Save,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { safe } from "ts-safe";

import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Skeleton } from "ui/skeleton";
import { ModelProviderIcon } from "ui/model-provider-icon";

interface APIKeyManagementProps {
  className?: string;
}

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    description: "GPT models, DALL-E, and more",
    placeholder: "sk-...",
  },
  {
    id: "google",
    name: "Google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    description: "Gemini models",
    placeholder: "AI...",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    description: "Claude models",
    placeholder: "sk-ant-...",
  },
  {
    id: "xai",
    name: "xAI",
    envKey: "XAI_API_KEY",
    description: "Grok models",
    placeholder: "xai-...",
  },
  {
    id: "groq",
    name: "Groq",
    envKey: "GROQ_API_KEY",
    description: "Fast inference models",
    placeholder: "gsk_...",
  },
  {
    id: "openRouter",
    name: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    description: "Multiple model providers",
    placeholder: "sk-or-...",
  },
  {
    id: "exa",
    name: "Exa AI",
    envKey: "EXA_API_KEY",
    description: "Web search and content extraction",
    placeholder: "exa_...",
  },
];

export function APIKeyManagement({ className }: APIKeyManagementProps) {
  const [apiKeys, setApiKeys] = useObjectState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState<Record<string, boolean>>({});

  const {
    data: currentKeys,
    mutate: fetchKeys,
    isLoading,
    isValidating,
  } = useSWR<Record<string, { hasKey: boolean; isValid?: boolean }>>(
    "/api/user/api-keys",
    fetcher,
    {
      fallback: {},
      dedupingInterval: 0,
      onSuccess: (data) => {
        const keys: Record<string, string> = {};
        PROVIDERS.forEach((provider) => {
          keys[provider.id] = data[provider.id]?.hasKey ? "****" : "";
        });
        setApiKeys(keys);
      },
    },
  );

  const saveAPIKeys = async () => {
    safe(() => setIsSaving(true))
      .ifOk(() =>
        fetch("/api/user/api-keys", {
          method: "PUT",
          body: JSON.stringify(apiKeys),
        }),
      )
      .ifOk(() => fetchKeys())
      .watch((result) => {
        if (result.isOk) {
          toast.success("API keys saved successfully");
        } else {
          toast.error("Failed to save API keys");
        }
      })
      .watch(() => setIsSaving(false));
  };

  const checkAPIKey = async (providerId: string) => {
    setIsChecking((prev) => ({ ...prev, [providerId]: true }));

    try {
      const response = await fetch(`/api/user/api-keys/check`, {
        method: "POST",
        body: JSON.stringify({ provider: providerId }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          `${PROVIDERS.find((p) => p.id === providerId)?.name} API key is ${result.isValid ? "valid" : "invalid"}`,
        );
        fetchKeys(); // Refresh the status
      } else {
        toast.error("Failed to check API key");
      }
    } catch (_error) {
      toast.error("Failed to check API key");
    } finally {
      setIsChecking((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const toggleKeyVisibility = (providerId: string) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const isDiff = useMemo(() => {
    return Object.keys(apiKeys).some(
      (key) => apiKeys[key] !== (currentKeys?.[key]?.hasKey ? "****" : ""),
    );
  }, [apiKeys, currentKeys]);

  const getKeyStatus = (providerId: string) => {
    const provider = currentKeys?.[providerId];
    if (!provider?.hasKey)
      return {
        status: "missing",
        icon: AlertCircle,
        color: "text-muted-foreground",
      };
    if (provider.isValid === undefined)
      return { status: "unknown", icon: Key, color: "text-yellow-500" };
    if (provider.isValid)
      return { status: "valid", icon: CheckCircle, color: "text-green-500" };
    return { status: "invalid", icon: AlertCircle, color: "text-red-500" };
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <Key className="w-5 h-5" />
        <h3 className="text-xl font-semibold">API Key Management</h3>
      </div>
      <p className="text-sm text-muted-foreground py-2 pb-6">
        Manage your AI provider API keys. Keys are stored securely and used to
        access different AI models.
      </p>

      <div className="flex flex-col gap-6 w-full">
        {PROVIDERS.map((provider) => {
          const keyStatus = getKeyStatus(provider.id);
          const StatusIcon = keyStatus.icon;
          const isKeyVisible = showKeys[provider.id];
          const currentKey = apiKeys[provider.id] || "";
          const isCheckingKey = isChecking[provider.id];

          return (
            <div
              key={provider.id}
              className="flex flex-col gap-3 p-4 border rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ModelProviderIcon
                    provider={provider.id}
                    className="w-5 h-5"
                  />
                  <div>
                    <h4 className="font-medium">{provider.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {provider.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${keyStatus.color}`} />
                  {isCheckingKey && <Loader className="w-4 h-4 animate-spin" />}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor={`${provider.id}-key`} className="sr-only">
                    {provider.name} API Key
                  </Label>
                  {isLoading ? (
                    <Skeleton className="h-9" />
                  ) : (
                    <Input
                      id={`${provider.id}-key`}
                      type={isKeyVisible ? "text" : "password"}
                      placeholder={provider.placeholder}
                      value={currentKey}
                      onChange={(e) => {
                        setApiKeys({
                          [provider.id]: e.target.value,
                        });
                      }}
                      className="font-mono text-sm"
                    />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleKeyVisibility(provider.id)}
                  disabled={isLoading}
                >
                  {isKeyVisible ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => checkAPIKey(provider.id)}
                  disabled={isLoading || isCheckingKey || !currentKey}
                >
                  {isCheckingKey ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    "Test"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {isDiff && !isValidating && (
        <div className="flex pt-4 items-center justify-end gap-2 fade-in animate-in duration-300">
          <Button variant="ghost" onClick={() => fetchKeys()}>
            Cancel
          </Button>
          <Button disabled={isSaving || isLoading} onClick={saveAPIKeys}>
            <Save className="w-4 h-4 mr-2" />
            Save API Keys
            {isSaving && <Loader className="size-4 ml-2 animate-spin" />}
          </Button>
        </div>
      )}
    </div>
  );
}
