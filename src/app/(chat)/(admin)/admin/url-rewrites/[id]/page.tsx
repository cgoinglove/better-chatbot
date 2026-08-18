import { UrlRewriteForm } from "@/components/admin/url-rewrites/url-rewrite-form";
import { requireAdminPermission } from "auth/permissions";
import { notFound, unauthorized } from "next/navigation";
import { urlRewriteRepository } from "lib/db/repository";

export const dynamic = "force-dynamic";

export default async function EditUrlRewritePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }

  const { id } = await params;
  const rewrite = await urlRewriteRepository.selectById(id);
  if (!rewrite) notFound();

  return <UrlRewriteForm rewrite={rewrite} />;
}
