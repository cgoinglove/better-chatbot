import type { DeploymentMode } from "app-types/platform";
import { eq, type Column } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { TenantSchema } from "lib/db/pg/schema.pg";

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  deploymentMode: DeploymentMode;
};

const DEFAULT_DEPLOYMENT_MODE: DeploymentMode = "single-tenant";

/**
 * Resolves the tenant context from incoming request headers.
 *
 * Resolution order:
 *   1. `x-tenant-id` header  -> look up by ID
 *   2. `x-tenant-slug` header -> look up by slug
 *   3. Fall back to `DEFAULT_TENANT_SLUG` env var
 *
 * Throws if no tenant can be resolved.
 */
export async function getTenantContext(
  headers: Headers,
): Promise<TenantContext> {
  const deploymentMode: DeploymentMode =
    (process.env.DEPLOYMENT_MODE as DeploymentMode) ?? DEFAULT_DEPLOYMENT_MODE;

  const tenantIdHeader = headers.get("x-tenant-id");
  const tenantSlugHeader = headers.get("x-tenant-slug");

  if (tenantIdHeader) {
    const [tenant] = await pgDb
      .select({
        id: TenantSchema.id,
        slug: TenantSchema.slug,
        deploymentMode: TenantSchema.deploymentMode,
      })
      .from(TenantSchema)
      .where(eq(TenantSchema.id, tenantIdHeader))
      .limit(1);

    if (!tenant) {
      throw new Error(`Tenant not found for id: ${tenantIdHeader}`);
    }

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      deploymentMode: tenant.deploymentMode ?? deploymentMode,
    };
  }

  const slug = tenantSlugHeader ?? process.env.DEFAULT_TENANT_SLUG;

  if (!slug) {
    throw new Error(
      "Unable to resolve tenant: no x-tenant-id or x-tenant-slug header provided and DEFAULT_TENANT_SLUG is not set",
    );
  }

  const [tenant] = await pgDb
    .select({
      id: TenantSchema.id,
      slug: TenantSchema.slug,
      deploymentMode: TenantSchema.deploymentMode,
    })
    .from(TenantSchema)
    .where(eq(TenantSchema.slug, slug))
    .limit(1);

  if (!tenant) {
    throw new Error(`Tenant not found for slug: ${slug}`);
  }

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    deploymentMode: tenant.deploymentMode ?? deploymentMode,
  };
}

/**
 * Returns a Drizzle filter condition that scopes queries to a specific tenant.
 *
 * Pass the `tenantId` column from whatever table you are querying:
 *
 *   import { ConnectorSchema } from "lib/db/pg/schema.pg";
 *
 *   const rows = await pgDb
 *     .select()
 *     .from(ConnectorSchema)
 *     .where(withTenantId(ConnectorSchema.tenantId, tenantId));
 */
export function withTenantId(column: Column, tenantId: string) {
  return eq(column, tenantId);
}
