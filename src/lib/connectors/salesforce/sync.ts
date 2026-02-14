import { eq, and, sql } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { LeadSchema } from "lib/db/pg/schema.pg";
import type { SyncResult } from "../../platform/connectors/base";
import type { SalesforceClient } from "./client";
import type { SFLead, SFContact, SFOpportunity } from "./types";
import {
  mapSFLeadToLead,
  mapSFContactToLead,
  getDefaultSoqlFields,
} from "./mappings";
import type { LeadCreateData } from "./mappings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a JS Date as a Salesforce-compatible ISO 8601 datetime string
 * for use in SOQL WHERE clauses.
 */
function toSoqlDateTime(date: Date): string {
  return date.toISOString().replace("Z", "+00:00");
}

/**
 * Build a WHERE clause fragment for incremental sync.
 */
function sinceClause(since?: Date): string {
  if (!since) return "";
  return ` WHERE LastModifiedDate > ${toSoqlDateTime(since)}`;
}

/**
 * Upsert a single lead record into the `lead` table.
 *
 * Matching is performed on `(tenant_id, external_id)`. If a match is found,
 * the record is updated; otherwise a new row is inserted.
 */
async function upsertLead(leadData: LeadCreateData): Promise<"created" | "updated"> {
  if (!leadData.externalId) {
    // No external ID -- always insert as a new record.
    await pgDb.insert(LeadSchema).values({
      tenantId: leadData.tenantId,
      source: leadData.source,
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email ?? null,
      company: leadData.company ?? null,
      title: leadData.title ?? null,
      phone: leadData.phone ?? null,
      status: leadData.status,
      score: leadData.score ?? null,
      estimatedValue: leadData.estimatedValue?.toString() ?? null,
      data: leadData.data,
      assignedTo: leadData.assignedTo ?? null,
    });
    return "created";
  }

  // Check if a record with the same external ID already exists for this tenant.
  const [existing] = await pgDb
    .select({ id: LeadSchema.id })
    .from(LeadSchema)
    .where(
      and(
        eq(LeadSchema.tenantId, leadData.tenantId),
        eq(LeadSchema.externalId, leadData.externalId),
      ),
    )
    .limit(1);

  if (existing) {
    await pgDb
      .update(LeadSchema)
      .set({
        source: leadData.source,
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.email ?? null,
        company: leadData.company ?? null,
        title: leadData.title ?? null,
        phone: leadData.phone ?? null,
        status: leadData.status,
        score: leadData.score ?? null,
        estimatedValue: leadData.estimatedValue?.toString() ?? null,
        data: leadData.data,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(LeadSchema.id, existing.id));
    return "updated";
  }

  await pgDb.insert(LeadSchema).values({
    tenantId: leadData.tenantId,
    externalId: leadData.externalId,
    source: leadData.source,
    firstName: leadData.firstName,
    lastName: leadData.lastName,
    email: leadData.email ?? null,
    company: leadData.company ?? null,
    title: leadData.title ?? null,
    phone: leadData.phone ?? null,
    status: leadData.status,
    score: leadData.score ?? null,
    estimatedValue: leadData.estimatedValue?.toString() ?? null,
    data: leadData.data,
    assignedTo: leadData.assignedTo ?? null,
  });
  return "created";
}

// ---------------------------------------------------------------------------
// SalesforceSync
// ---------------------------------------------------------------------------

/**
 * Encapsulates the sync logic for pulling data from Salesforce into the
 * platform's `lead` table. Each `sync*` method queries Salesforce for a
 * specific object type, maps the records to the platform Lead model, and
 * upserts them.
 */
export class SalesforceSync {
  // -----------------------------------------------------------------------
  // Leads
  // -----------------------------------------------------------------------

  /**
   * Sync Salesforce Lead records into the platform `lead` table.
   *
   * @param client   - Authenticated SalesforceClient instance.
   * @param tenantId - The platform tenant to associate records with.
   * @param since    - If provided, only sync records modified after this date
   *                   (incremental sync). Otherwise all records are synced.
   */
  async syncLeads(
    client: SalesforceClient,
    tenantId: string,
    since?: Date,
  ): Promise<SyncResult> {
    const result: SyncResult = { recordsProcessed: 0, recordsFailed: 0, errors: [] };

    try {
      const fields = getDefaultSoqlFields("Lead").join(", ");
      const soql = `SELECT ${fields} FROM Lead${sinceClause(since)} ORDER BY LastModifiedDate ASC`;
      const sfLeads = await client.queryAll<SFLead>(soql);

      for (const sfLead of sfLeads) {
        try {
          const leadData = mapSFLeadToLead(sfLead, tenantId);
          await upsertLead(leadData);
          result.recordsProcessed++;
        } catch (err) {
          result.recordsFailed++;
          result.errors.push(
            `Failed to sync Lead ${sfLead.Id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err) {
      result.errors.push(
        `Lead sync query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Contacts
  // -----------------------------------------------------------------------

  /**
   * Sync Salesforce Contact records into the platform `lead` table.
   *
   * Contacts are mapped to leads with `source = "salesforce"` and the
   * Salesforce Contact Id as the `external_id`.
   */
  async syncContacts(
    client: SalesforceClient,
    tenantId: string,
    since?: Date,
  ): Promise<SyncResult> {
    const result: SyncResult = { recordsProcessed: 0, recordsFailed: 0, errors: [] };

    try {
      const fields = getDefaultSoqlFields("Contact").join(", ");
      const soql = `SELECT ${fields} FROM Contact${sinceClause(since)} ORDER BY LastModifiedDate ASC`;
      const sfContacts = await client.queryAll<SFContact>(soql);

      for (const sfContact of sfContacts) {
        try {
          const leadData = mapSFContactToLead(sfContact, tenantId);
          await upsertLead(leadData);
          result.recordsProcessed++;
        } catch (err) {
          result.recordsFailed++;
          result.errors.push(
            `Failed to sync Contact ${sfContact.Id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err) {
      result.errors.push(
        `Contact sync query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Opportunities
  // -----------------------------------------------------------------------

  /**
   * Sync Salesforce Opportunity records into the platform `lead` table.
   *
   * Opportunities are stored with `source = "salesforce"` and the opportunity
   * data is preserved in the `data` JSON field. The `Name` field is split
   * into `firstName` / `lastName` using a simple heuristic.
   */
  async syncOpportunities(
    client: SalesforceClient,
    tenantId: string,
    since?: Date,
  ): Promise<SyncResult> {
    const result: SyncResult = { recordsProcessed: 0, recordsFailed: 0, errors: [] };

    try {
      const fields = getDefaultSoqlFields("Opportunity").join(", ");
      const soql = `SELECT ${fields} FROM Opportunity${sinceClause(since)} ORDER BY LastModifiedDate ASC`;
      const sfOpportunities = await client.queryAll<SFOpportunity>(soql);

      for (const sfOpp of sfOpportunities) {
        try {
          const leadData = mapOpportunityToLead(sfOpp, tenantId);
          await upsertLead(leadData);
          result.recordsProcessed++;
        } catch (err) {
          result.recordsFailed++;
          result.errors.push(
            `Failed to sync Opportunity ${sfOpp.Id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err) {
      result.errors.push(
        `Opportunity sync query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Sync All
  // -----------------------------------------------------------------------

  /**
   * Run all object syncs (Leads, Contacts, Opportunities) and return an
   * aggregated `SyncResult`.
   */
  async syncAll(
    client: SalesforceClient,
    tenantId: string,
    since?: Date,
  ): Promise<SyncResult> {
    const aggregated: SyncResult = {
      recordsProcessed: 0,
      recordsFailed: 0,
      errors: [],
    };

    const results = await Promise.allSettled([
      this.syncLeads(client, tenantId, since),
      this.syncContacts(client, tenantId, since),
      this.syncOpportunities(client, tenantId, since),
    ]);

    for (const outcome of results) {
      if (outcome.status === "fulfilled") {
        aggregated.recordsProcessed += outcome.value.recordsProcessed;
        aggregated.recordsFailed += outcome.value.recordsFailed;
        aggregated.errors.push(...outcome.value.errors);
      } else {
        aggregated.errors.push(
          `Sync batch failed: ${outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)}`,
        );
      }
    }

    return aggregated;
  }
}

// ---------------------------------------------------------------------------
// Internal: Opportunity -> LeadCreateData
// ---------------------------------------------------------------------------

/**
 * Map a Salesforce Opportunity to a platform LeadCreateData.
 *
 * Because Opportunities don't have first/last name fields, we derive them
 * from the Opportunity `Name` field using a simple split heuristic.
 */
function mapOpportunityToLead(
  sfOpp: SFOpportunity,
  tenantId: string,
): LeadCreateData {
  // Derive first/last name from the opportunity name. This is a best-effort
  // mapping since Opportunity.Name is typically a deal name, not a person name.
  const nameParts = (sfOpp.Name || "Opportunity").split(/\s+/);
  const firstName = nameParts[0] || "Opportunity";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : sfOpp.Id;

  // Map StageName to platform status
  const statusMap: Record<string, "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost"> = {
    "Prospecting": "new",
    "Qualification": "qualified",
    "Needs Analysis": "qualified",
    "Value Proposition": "proposal",
    "Id. Decision Makers": "qualified",
    "Perception Analysis": "proposal",
    "Proposal/Price Quote": "proposal",
    "Negotiation/Review": "negotiation",
    "Closed Won": "won",
    "Closed Lost": "lost",
  };
  const status = statusMap[sfOpp.StageName] ?? "contacted";

  return {
    tenantId,
    externalId: sfOpp.Id,
    source: "salesforce",
    firstName,
    lastName,
    status,
    estimatedValue: sfOpp.Amount || undefined,
    score: sfOpp.Probability != null ? Math.round(sfOpp.Probability) : undefined,
    data: {
      salesforceObject: "Opportunity",
      opportunityName: sfOpp.Name ?? null,
      stageName: sfOpp.StageName ?? null,
      closeDate: sfOpp.CloseDate ?? null,
      probability: sfOpp.Probability ?? null,
      amount: sfOpp.Amount ?? null,
      accountId: sfOpp.AccountId ?? null,
      type: sfOpp.Type ?? null,
      leadSource: sfOpp.LeadSource ?? null,
      description: sfOpp.Description ?? null,
      sfCreatedDate: sfOpp.CreatedDate ?? null,
      sfLastModifiedDate: sfOpp.LastModifiedDate ?? null,
    },
  };
}
