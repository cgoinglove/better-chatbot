import type { User } from "./user";

export interface AdminUsersQuery {
  searchValue?: string;
  searchField?: "name" | "email";
  searchOperator?: "contains" | "starts_with" | "ends_with";
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filterField?: string;
  filterValue?: string | number | boolean;
  filterOperator?: "lt" | "eq" | "ne" | "lte" | "gt" | "gte" | "contains";
}

// Better Auth's UserWithRole type - minimal definition for list view
export type AdminUserListItem = Omit<
  User,
  | "password"
  | "preferences"
  | "image"
  | "role"
  | "banned"
  | "banReason"
  | "banExpires"
> & {
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
};

export interface AdminUsersPaginated {
  users: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminUserRoleCounts {
  total: number;
  online: number;
  admin: number;
  editor: number;
  user: number;
}

export interface AdminAnalyticsPoint {
  date: string; // ISO yyyy-MM-dd
  count: number;
}

export interface AdminUserAnalytics {
  growth: AdminAnalyticsPoint[];
  activeUsers: AdminAnalyticsPoint[];
  twoDayStreakUsers: AdminAnalyticsPoint[];
  threeDayStreakUsers: AdminAnalyticsPoint[];
}

export interface AdminUpdateUserDetailsData {
  userId: string;
  name?: string;
  email?: string;
  image?: string;
}

export const ADMIN_USAGE_PERIODS = ["7", "30", "90", "all"] as const;
export type AdminUsagePeriod = (typeof ADMIN_USAGE_PERIODS)[number];

export interface AdminUsageTotals {
  threads: number;
  messages: number;
  assistantMessages: number;
  unattributedMessages: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  activeUsers: number;
}

export interface AdminUsageTimePoint {
  date: string;
  messages: number;
  tokens: number;
}

export interface AdminModelUsageDbRow {
  provider: string;
  model: string;
  threadCount: number;
  messageCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  lastUsedAt: Date | null;
}

export interface AdminUsageDbStats {
  totals: AdminUsageTotals;
  timeline: AdminUsageTimePoint[];
  models: AdminModelUsageDbRow[];
}

export interface AdminModelUsageRow
  extends Omit<AdminModelUsageDbRow, "lastUsedAt"> {
  lastUsedAt: string | null;
  available: boolean;
  hasApiKey: boolean;
}

export interface AdminUsageOverview {
  period: AdminUsagePeriod;
  totals: AdminUsageTotals;
  timeline: AdminUsageTimePoint[];
  models: AdminModelUsageRow[];
  availableModelCount: number;
}

// Admin only repository methods
export type AdminRepository = {
  // User queries
  getUsers: (query?: AdminUsersQuery) => Promise<AdminUsersPaginated>;
  getUserRoleCounts: () => Promise<AdminUserRoleCounts>;
  getUserAnalytics: (days: number) => Promise<AdminUserAnalytics>;
  // Usage analytics
  getUsageStats: (since: Date | null) => Promise<AdminUsageDbStats>;
};
