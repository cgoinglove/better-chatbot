"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "ui/button";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "lib/utils";

/**
 * The public URL is built in the browser: the app has no client-visible base url
 * env var, and `window.location.origin` is what the admin actually sees.
 */
export function useGotoUrl(slug: string) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return origin ? `${origin}/goto/${slug}` : `/goto/${slug}`;
}

export function CopyLinkButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const t = useTranslations("Admin.UrlRewrites");
  const url = useGotoUrl(slug);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 1500);
    },
    [url, t],
  );

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-7", className)}
      onClick={copy}
      aria-label={t("copyLink")}
      data-testid="url-rewrite-copy-link"
    >
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  );
}
