"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Form from "next/form";
import Link from "next/link";
import { format } from "date-fns";
import { Loader, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { Badge } from "ui/badge";
import { Button, buttonVariants } from "ui/button";
import { Input } from "ui/input";
import { TablePagination } from "ui/table-pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "ui/alert-dialog";
import { cn } from "lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  isUrlRewriteActive,
  type UrlRewriteListItem,
} from "app-types/url-rewrite";
import { deleteUrlRewriteAction } from "@/app/api/admin/url-rewrites/actions";
import { CopyLinkButton } from "./copy-link-button";

const BASE_URL = "/admin/url-rewrites";

interface UrlRewritesTableProps {
  items: UrlRewriteListItem[];
  total: number;
  page: number;
  limit: number;
  query?: string;
}

function TargetSummary({ item }: { item: UrlRewriteListItem }) {
  const t = useTranslations("Admin.UrlRewrites");
  if (item.target.targetKind !== "chat") {
    return <span className="text-muted-foreground">{item.targetKind}</span>;
  }
  const { preset } = item.target;
  const toolCount =
    (preset.mentions?.length ?? 0) +
    (preset.allowedAppDefaultToolkit?.length ?? 0);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {preset.chatModel && (
        <Badge variant="secondary" className="font-normal">
          {preset.chatModel.model}
        </Badge>
      )}
      {toolCount > 0 && (
        <Badge variant="secondary" className="font-normal">
          {toolCount} {t("fieldTools").toLowerCase()}
        </Badge>
      )}
      {preset.message && (
        <Badge variant="outline" className="font-normal">
          {preset.message.mode === "send" ? t("modeSend") : t("modePrefill")}
        </Badge>
      )}
    </div>
  );
}

export function UrlRewritesTable({
  items,
  total,
  page,
  limit,
  query,
}: UrlRewritesTableProps) {
  const t = useTranslations("Admin.UrlRewrites");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<UrlRewriteListItem | null>(
    null,
  );
  const [isDeleting, startDelete] = useTransition();

  const submitForm = useCallback(() => formRef.current?.requestSubmit(), []);
  const debouncedSubmit = useDebounce(submitForm, 300);

  const buildUrl = useCallback(
    ({ page: nextPage }: { page: number }) => {
      const params = new URLSearchParams();
      if (nextPage > 1) params.set("page", nextPage.toString());
      if (query) params.set("query", query);
      const search = params.toString();
      return search ? `${BASE_URL}?${search}` : BASE_URL;
    },
    [query],
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deleteUrlRewriteAction(deleteTarget.id);
      if (result.success) {
        toast.success(t("linkDeleted"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }, [deleteTarget, router, t]);

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Form action={BASE_URL} ref={formRef}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              key={query ?? "empty"}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
              name="query"
              defaultValue={query}
              onChange={debouncedSubmit}
              data-testid="url-rewrites-search-input"
            />
          </Form>
        </div>
        {query && (
          <Link
            href={BASE_URL}
            className={cn("shrink-0", buttonVariants({ variant: "outline" }))}
          >
            <X className="h-4 w-4 mr-1" />
            {t("clear")}
          </Link>
        )}
        <div className="text-sm text-muted-foreground">
          {t("totalCount", { count: total })}
        </div>
        <div className="flex-1" />
        <Link
          href={`${BASE_URL}/new`}
          className={cn("shrink-0", buttonVariants())}
          data-testid="url-rewrite-new-button"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("newLink")}
        </Link>
      </div>

      <div className="rounded-lg border bg-card w-full overflow-x-auto">
        <Table data-testid="url-rewrites-table" className="w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("columnLink")}</TableHead>
              <TableHead>{t("columnName")}</TableHead>
              <TableHead>{t("columnTarget")}</TableHead>
              <TableHead>{t("columnStatus")}</TableHead>
              <TableHead>{t("columnCreated")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <p className="font-medium">{t("noLinksFound")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("noLinksFoundDescription")}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const active = isUrlRewriteActive(item);
                const expired =
                  item.enabled &&
                  !!item.expiresAt &&
                  item.expiresAt.getTime() <= Date.now();
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`${BASE_URL}/${item.id}`)}
                    data-testid={`url-rewrite-row-${item.slug}`}
                  >
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-1">
                        <span>/goto/{item.slug}</span>
                        <CopyLinkButton slug={item.slug} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <TargetSummary item={item} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={active ? "secondary" : "outline"}>
                        {expired
                          ? t("expired")
                          : item.enabled
                            ? t("enabled")
                            : t("disabled")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(item.createdAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={t("deleteLink")}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(item);
                        }}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={page}
        totalPages={Math.ceil(total / limit)}
        buildUrl={buildUrl}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteLink")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteLinkConfirm", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isDeleting && <Loader className="size-3.5 mr-1 animate-spin" />}
              {t("deleteLink")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
