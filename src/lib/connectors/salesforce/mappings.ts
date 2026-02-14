import type { Lead, LeadSource, LeadStatus } from "app-types/platform";
import type {
  SalesforceObject,
  SFLead,
  SFContact,
} from "./types";

// ---------------------------------------------------------------------------
// LeadCreateData -- shape for inserting into the lead table
// (mirrors the Lead type without server-generated fields)
// ---------------------------------------------------------------------------

export type LeadCreateData = {
  tenantId: string;
  externalId?: string;
  source: LeadSource;
  firstName: string;
  lastName: string;
  email?: string;
  company?: string;
  title?: string;
  phone?: string;
  status: LeadStatus;
  score?: number;
  estimatedValue?: number;
  data: Record<string, unknown>;
  assignedTo?: string;
};

// ---------------------------------------------------------------------------
// Status mapping helpers
// ---------------------------------------------------------------------------

/**
 * Map a Salesforce Lead.Status value to the closest platform LeadStatus.
 */
function mapSFLeadStatusToLeadStatus(sfStatus: string | undefined): LeadStatus {
  if (!sfStatus) return "new";

  const normalized = sfStatus.toLowerCase().trim();

  const mapping: Record<string, LeadStatus> = {
    "open - not contacted": "new",
    "open": "new",
    "new": "new",
    "working - contacted": "contacted",
    "contacted": "contacted",
    "working": "contacted",
    "closed - converted": "won",
    "converted": "won",
    "closed - not converted": "lost",
    "not converted": "lost",
    "qualified": "qualified",
    "nurturing": "contacted",
    "unqualified": "disqualified",
  };

  return mapping[normalized] ?? "new";
}

// ---------------------------------------------------------------------------
// SF Lead -> Platform Lead
// ---------------------------------------------------------------------------

/**
 * Map a Salesforce Lead object to the platform's `LeadCreateData` shape for
 * upserting into the `lead` table.
 */
export function mapSFLeadToLead(
  sfLead: SFLead,
  tenantId: string,
): LeadCreateData {
  return {
    tenantId,
    externalId: sfLead.Id,
    source: "salesforce" as LeadSource,
    firstName: sfLead.FirstName || "Unknown",
    lastName: sfLead.LastName || "Unknown",
    email: sfLead.Email || undefined,
    company: sfLead.Company || undefined,
    title: sfLead.Title || undefined,
    phone: sfLead.Phone || undefined,
    status: mapSFLeadStatusToLeadStatus(sfLead.Status),
    score: sfLead.Rating ? ratingToScore(sfLead.Rating) : undefined,
    estimatedValue: sfLead.AnnualRevenue || undefined,
    data: {
      salesforceObject: "Lead",
      leadSource: sfLead.LeadSource ?? null,
      rating: sfLead.Rating ?? null,
      industry: sfLead.Industry ?? null,
      annualRevenue: sfLead.AnnualRevenue ?? null,
      numberOfEmployees: sfLead.NumberOfEmployees ?? null,
      description: sfLead.Description ?? null,
      sfCreatedDate: sfLead.CreatedDate ?? null,
      sfLastModifiedDate: sfLead.LastModifiedDate ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// SF Contact -> Platform Lead
// ---------------------------------------------------------------------------

/**
 * Map a Salesforce Contact object to the platform's `LeadCreateData` shape.
 *
 * Contacts are typically already-converted or standalone records; they map
 * to leads with a "contacted" status by default.
 */
export function mapSFContactToLead(
  sfContact: SFContact,
  tenantId: string,
): LeadCreateData {
  return {
    tenantId,
    externalId: sfContact.Id,
    source: "salesforce" as LeadSource,
    firstName: sfContact.FirstName || "Unknown",
    lastName: sfContact.LastName || "Unknown",
    email: sfContact.Email || undefined,
    title: sfContact.Title || undefined,
    phone: sfContact.Phone || undefined,
    status: "contacted" as LeadStatus,
    data: {
      salesforceObject: "Contact",
      accountId: sfContact.AccountId ?? null,
      department: sfContact.Department ?? null,
      sfCreatedDate: sfContact.CreatedDate ?? null,
      sfLastModifiedDate: sfContact.LastModifiedDate ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Platform Lead -> SF Lead (push-back / reverse mapping)
// ---------------------------------------------------------------------------

/**
 * Map a platform Lead back to a partial Salesforce Lead for push-back
 * or two-way sync scenarios.
 */
export function mapLeadToSFLead(lead: Lead): Partial<SFLead> {
  const sfLead: Partial<SFLead> = {
    FirstName: lead.firstName,
    LastName: lead.lastName,
  };

  if (lead.email) sfLead.Email = lead.email;
  if (lead.company) sfLead.Company = lead.company;
  if (lead.title) sfLead.Title = lead.title;
  if (lead.phone) sfLead.Phone = lead.phone;

  // Map platform status back to Salesforce Lead.Status
  const statusMap: Partial<Record<LeadStatus, string>> = {
    new: "Open - Not Contacted",
    contacted: "Working - Contacted",
    qualified: "Qualified",
    won: "Closed - Converted",
    lost: "Closed - Not Converted",
    disqualified: "Closed - Not Converted",
  };
  const sfStatus = statusMap[lead.status];
  if (sfStatus) sfLead.Status = sfStatus;

  // Copy lead score back as Rating
  if (lead.score != null) {
    sfLead.Rating = scoreToRating(lead.score);
  }

  if (lead.estimatedValue != null) {
    sfLead.AnnualRevenue = lead.estimatedValue;
  }

  // Merge any extra data fields that originated from Salesforce
  if (lead.data) {
    const d = lead.data as Record<string, unknown>;
    if (d.industry) sfLead.Industry = d.industry as string;
    if (d.description) sfLead.Description = d.description as string;
    if (d.numberOfEmployees)
      sfLead.NumberOfEmployees = d.numberOfEmployees as number;
    if (d.leadSource) sfLead.LeadSource = d.leadSource as string;
  }

  return sfLead;
}

// ---------------------------------------------------------------------------
// Default SOQL fields per object type
// ---------------------------------------------------------------------------

/**
 * Return the default list of fields to select in a SOQL query for a given
 * Salesforce standard object.
 */
export function getDefaultSoqlFields(objectType: SalesforceObject): string[] {
  switch (objectType) {
    case "Lead":
      return [
        "Id",
        "FirstName",
        "LastName",
        "Email",
        "Company",
        "Title",
        "Phone",
        "Status",
        "LeadSource",
        "Rating",
        "Industry",
        "AnnualRevenue",
        "NumberOfEmployees",
        "Description",
        "CreatedDate",
        "LastModifiedDate",
      ];

    case "Contact":
      return [
        "Id",
        "FirstName",
        "LastName",
        "Email",
        "Phone",
        "Title",
        "AccountId",
        "Department",
        "CreatedDate",
        "LastModifiedDate",
      ];

    case "Account":
      return [
        "Id",
        "Name",
        "Industry",
        "Type",
        "Phone",
        "Website",
        "AnnualRevenue",
        "NumberOfEmployees",
        "BillingCity",
        "BillingState",
        "BillingCountry",
        "CreatedDate",
        "LastModifiedDate",
      ];

    case "Opportunity":
      return [
        "Id",
        "Name",
        "Amount",
        "StageName",
        "CloseDate",
        "Probability",
        "AccountId",
        "Type",
        "LeadSource",
        "Description",
        "CreatedDate",
        "LastModifiedDate",
      ];

    case "Task":
      return [
        "Id",
        "Subject",
        "Status",
        "Priority",
        "WhoId",
        "WhatId",
        "ActivityDate",
        "Description",
        "CreatedDate",
        "LastModifiedDate",
      ];

    case "Event":
      return [
        "Id",
        "Subject",
        "StartDateTime",
        "EndDateTime",
        "WhoId",
        "WhatId",
        "Location",
        "Description",
        "CreatedDate",
        "LastModifiedDate",
      ];

    case "Campaign":
      return [
        "Id",
        "Name",
        "Type",
        "Status",
        "StartDate",
        "EndDate",
        "BudgetedCost",
        "ActualCost",
        "NumberOfLeads",
        "NumberOfContacts",
        "NumberOfResponses",
        "CreatedDate",
        "LastModifiedDate",
      ];

    case "CampaignMember":
      return [
        "Id",
        "CampaignId",
        "LeadId",
        "ContactId",
        "Status",
        "CreatedDate",
        "LastModifiedDate",
      ];

    default:
      return ["Id", "CreatedDate", "LastModifiedDate"];
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Salesforce Lead Rating (Hot / Warm / Cold) into a numeric score.
 */
function ratingToScore(rating: string): number {
  const normalized = rating.toLowerCase().trim();
  if (normalized === "hot") return 90;
  if (normalized === "warm") return 60;
  if (normalized === "cold") return 30;
  return 50; // default / unknown
}

/**
 * Convert a numeric lead score back to a Salesforce Rating string.
 */
function scoreToRating(score: number): string {
  if (score >= 75) return "Hot";
  if (score >= 45) return "Warm";
  return "Cold";
}
