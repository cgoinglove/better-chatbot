"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader, RefreshCw } from "lucide-react";

import { Button, buttonVariants } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Switch } from "ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { cn } from "lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useObjectState } from "@/hooks/use-object-state";
import { isValidSlug, normalizeSlug } from "lib/url-rewrite/slug";
import type { ChatLinkPreset, UrlRewrite } from "app-types/url-rewrite";
import {
  createUrlRewriteAction,
  generateUrlRewriteSlugAction,
  isUrlRewriteSlugAvailableAction,
  updateUrlRewriteAction,
} from "@/app/api/admin/url-rewrites/actions";
import { ChatPresetFields } from "./chat-preset-fields";
import { CopyLinkButton, useGotoUrl } from "./copy-link-button";

const LIST_URL = "/admin/url-rewrites";

/** `datetime-local` needs a local `YYYY-MM-DDTHH:mm` string, not an ISO one. */
const toLocalInputValue = (date: Date | null) => {
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function UrlRewriteForm({
  rewrite,
  suggestedSlug,
}: {
  rewrite?: UrlRewrite;
  suggestedSlug?: string;
}) {
  const t = useTranslations("Admin.UrlRewrites");
  const router = useRouter();
  const isEdit = !!rewrite;

  const [form, setForm] = useObjectState({
    slug: rewrite?.slug ?? suggestedSlug ?? "",
    name: rewrite?.name ?? "",
    description: rewrite?.description ?? "",
    enabled: rewrite?.enabled ?? true,
    expiresAt: toLocalInputValue(rewrite?.expiresAt ?? null),
  });

  const [preset, setPreset] = useState<ChatLinkPreset>(
    rewrite?.target.targetKind === "chat" ? rewrite.target.preset : {},
  );

  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [isSaving, startSaving] = useTransition();
  const previewUrl = useGotoUrl(form.slug || "…");

  const checkSlug = useCallback(
    async (slug: string) => {
      if (!slug) return setSlugStatus("idle");
      if (!isValidSlug(slug)) return setSlugStatus("invalid");
      if (rewrite && normalizeSlug(slug) === rewrite.slug)
        return setSlugStatus("idle");
      setSlugStatus("checking");
      const available = await isUrlRewriteSlugAvailableAction(
        slug,
        rewrite?.id,
      ).catch(() => false);
      setSlugStatus(available ? "available" : "taken");
    },
    [rewrite],
  );

  const debouncedCheckSlug = useDebounce(checkSlug, 400);

  useEffect(() => {
    if (isEdit) return;
    // Surface a collision on the suggested slug immediately rather than on save.
    checkSlug(form.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerateSlug = useCallback(async () => {
    const slug = await generateUrlRewriteSlugAction().catch(() => null);
    if (!slug) return;
    setForm({ slug });
    setSlugStatus("available");
  }, [setForm]);

  const submit = useCallback(() => {
    if (!form.name.trim()) {
      toast.error(t("fieldName"));
      return;
    }
    if (!isValidSlug(form.slug)) {
      setSlugStatus("invalid");
      toast.error(t("slugInvalid"));
      return;
    }

    const payload = {
      slug: form.slug,
      name: form.name.trim(),
      description: form.description.trim() || null,
      enabled: form.enabled,
      expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
      target: { targetKind: "chat" as const, preset },
    };

    startSaving(async () => {
      const result = isEdit
        ? await updateUrlRewriteAction({ ...payload, id: rewrite.id })
        : await createUrlRewriteAction(payload);

      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(isEdit ? t("linkSaved") : t("linkCreated"));
      router.push(LIST_URL);
      router.refresh();
    });
  }, [form, preset, isEdit, rewrite, router, t]);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href={LIST_URL}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="size-4 mr-1" />
          {t("backToLinks")}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">
          {isEdit ? t("editLink") : t("createLink")}
        </h1>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="rewrite-name">{t("fieldName")}</Label>
            <Input
              id="rewrite-name"
              value={form.name}
              placeholder={t("fieldNamePlaceholder")}
              onChange={(event) => setForm({ name: event.target.value })}
              data-testid="url-rewrite-name"
            />
            <p className="text-xs text-muted-foreground">
              {t("fieldNameDescription")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rewrite-description">{t("fieldDescription")}</Label>
            <Input
              id="rewrite-description"
              value={form.description}
              placeholder={t("fieldDescriptionPlaceholder")}
              onChange={(event) => setForm({ description: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rewrite-slug">{t("fieldSlug")}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-mono shrink-0">
                /goto/
              </span>
              <Input
                id="rewrite-slug"
                value={form.slug}
                className="font-mono"
                onChange={(event) => {
                  const slug = event.target.value.trim();
                  setForm({ slug });
                  setSlugStatus("idle");
                  debouncedCheckSlug(slug);
                }}
                data-testid="url-rewrite-slug"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={regenerateSlug}
                aria-label={t("regenerate")}
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
            <p
              className={cn(
                "text-xs",
                slugStatus === "taken" || slugStatus === "invalid"
                  ? "text-destructive"
                  : slugStatus === "available"
                    ? "text-green-600 dark:text-green-500"
                    : "text-muted-foreground",
              )}
              data-testid="url-rewrite-slug-status"
            >
              {slugStatus === "taken"
                ? t("slugTaken")
                : slugStatus === "invalid"
                  ? t("slugInvalid")
                  : slugStatus === "available"
                    ? t("slugAvailable")
                    : t("fieldSlugDescription")}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("preview")}
            </span>
            <span
              className="font-mono text-sm truncate"
              data-testid="url-rewrite-preview"
            >
              {previewUrl}
            </span>
            <div className="flex-1" />
            {isValidSlug(form.slug) && <CopyLinkButton slug={form.slug} />}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="rewrite-enabled">{t("fieldEnabled")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("fieldEnabledDescription")}
              </p>
            </div>
            <Switch
              id="rewrite-enabled"
              checked={form.enabled}
              onCheckedChange={(enabled) => setForm({ enabled })}
              data-testid="url-rewrite-enabled"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rewrite-expires">{t("fieldExpiresAt")}</Label>
            <Input
              id="rewrite-expires"
              type="datetime-local"
              value={form.expiresAt}
              className="w-fit"
              onChange={(event) => setForm({ expiresAt: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {t("fieldExpiresAtDescription")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("sectionTarget")}</CardTitle>
          <CardDescription>{t("sectionTargetDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChatPresetFields preset={preset} onChange={setPreset} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 pb-10">
        <Link
          href={LIST_URL}
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          {t("cancel")}
        </Link>
        <Button
          onClick={submit}
          disabled={isSaving || slugStatus === "taken"}
          data-testid="url-rewrite-save"
        >
          {isSaving && <Loader className="size-3.5 mr-1 animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
