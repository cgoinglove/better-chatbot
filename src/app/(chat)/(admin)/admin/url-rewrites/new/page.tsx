import { UrlRewriteForm } from "@/components/admin/url-rewrites/url-rewrite-form";
import { requireAdminPermission } from "auth/permissions";
import { unauthorized } from "next/navigation";
import { generateUniqueSlug } from "lib/url-rewrite/slug";
import { urlRewriteRepository } from "lib/db/repository";

export const dynamic = "force-dynamic";

export default async function NewUrlRewritePage() {
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }

  const suggestedSlug = await generateUniqueSlug((slug) =>
    urlRewriteRepository.existsBySlug(slug),
  );

  return <UrlRewriteForm suggestedSlug={suggestedSlug} />;
}
