import { UrlRewritesTable } from "@/components/admin/url-rewrites/url-rewrites-table";
import { requireAdminPermission } from "auth/permissions";
import { unauthorized } from "next/navigation";
import { urlRewriteRepository } from "lib/db/repository";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 20;

interface PageProps {
  searchParams: Promise<{ page?: string; query?: string }>;
}

export default async function UrlRewritesPage({ searchParams }: PageProps) {
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }

  const params = await searchParams;
  const page = Math.max(parseInt(params.page ?? "1", 10) || 1, 1);
  const { items, total } = await urlRewriteRepository.selectList({
    query: params.query,
    limit: PAGE_LIMIT,
    offset: (page - 1) * PAGE_LIMIT,
  });

  return (
    <UrlRewritesTable
      items={items}
      total={total}
      page={page}
      limit={PAGE_LIMIT}
      query={params.query}
    />
  );
}
