export type SalesforceAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  instanceUrl: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
};

export type SalesforceObject =
  | "Lead"
  | "Contact"
  | "Account"
  | "Opportunity"
  | "Task"
  | "Event"
  | "Campaign"
  | "CampaignMember";

export type SFLead = {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Company: string;
  Title: string;
  Phone: string;
  Status: string;
  LeadSource: string;
  Rating: string;
  Industry: string;
  AnnualRevenue: number;
  NumberOfEmployees: number;
  Description: string;
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: unknown;
};

export type SFContact = {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  Title: string;
  AccountId: string;
  Department: string;
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: unknown;
};

export type SFAccount = {
  Id: string;
  Name: string;
  Industry: string;
  Type: string;
  Phone: string;
  Website: string;
  AnnualRevenue: number;
  NumberOfEmployees: number;
  BillingCity: string;
  BillingState: string;
  BillingCountry: string;
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: unknown;
};

export type SFOpportunity = {
  Id: string;
  Name: string;
  Amount: number;
  StageName: string;
  CloseDate: string;
  Probability: number;
  AccountId: string;
  Type: string;
  LeadSource: string;
  Description: string;
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: unknown;
};

export type SalesforceQueryResult<T> = {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
};
