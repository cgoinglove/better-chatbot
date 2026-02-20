"use client";

import { useCallback, useState, useEffect } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Button } from "ui/button";
import { redriectMcpOauth } from "lib/ai/mcp/oauth-redirect";
import type { MCPServerInfo } from "app-types/mcp";

interface MCPAuthDialogProps {
  server: MCPServerInfo | undefined;
  serverName: string;
}

export function MCPAuthDialog({ server, serverName }: MCPAuthDialogProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const needsAuth = server?.status === "authorizing";

  useEffect(() => {
    if (!needsAuth) {
      setDismissed(false);
    }
  }, [needsAuth]);

  const handleAuthorize = useCallback(() => {
    if (!server) return;
    setLoading(true);
    redriectMcpOauth(server.id)
      .then(() => mutate("/api/mcp/list"))
      .catch((err) => toast.error(err?.message || t("MCP.authorizationFailed")))
      .finally(() => setLoading(false));
  }, [server, t]);

  if (!server || !needsAuth || dismissed) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("MCP.authorizationRequired")}</DialogTitle>
          <DialogDescription>
            {t("MCP.authorizationRequiredDescription", { serverName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              {t("Common.cancel")}
            </Button>
          </DialogClose>
          <Button onClick={handleAuthorize} disabled={loading} autoFocus>
            {t("MCP.authorize")}
            {loading && <Loader className="size-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
