import {
  PLAN_LIMITS,
  type BillingPlan,
  type PlanLimits,
} from "app-types/platform";

export function getPlanLimits(plan: BillingPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function checkLimit(
  plan: BillingPlan,
  resource: keyof PlanLimits,
  currentUsage: number,
): { allowed: boolean; limit: number; remaining: number } {
  const limits = PLAN_LIMITS[plan];
  const limit = limits[resource] as number;
  if (limit === -1) return { allowed: true, limit: -1, remaining: -1 }; // unlimited
  return {
    allowed: currentUsage < limit,
    limit,
    remaining: Math.max(0, limit - currentUsage),
  };
}

export const PLAN_DETAILS: Record<
  BillingPlan,
  { name: string; price: number; interval: "month"; description: string }
> = {
  starter: {
    name: "Starter",
    price: 2000,
    interval: "month",
    description:
      "Perfect for small teams getting started with AI-powered sales",
  },
  professional: {
    name: "Professional",
    price: 5000,
    interval: "month",
    description: "For growing teams that need advanced capabilities",
  },
  enterprise: {
    name: "Enterprise",
    price: 10000,
    interval: "month",
    description:
      "Full platform access with unlimited usage and air-gapped deployment",
  },
};
