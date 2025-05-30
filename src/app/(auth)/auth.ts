/**
 * Direct exports from Better Auth - no compatibility layers
 */

import { auth as betterAuthInstance, getSession } from 'lib/auth/server';
import { NextRequest } from 'next/server';

// Export Better Auth instance
export const auth = betterAuthInstance;

// Use the Better Auth API directly
export const signIn = async (provider: string, options: any = {}) => {
  // Type assertion is needed because TypeScript doesn't know about these methods
  return (auth.api as any).signIn({
    provider,
    ...options,
  });
};

export const signOut = async () => {
  // Type assertion is needed because TypeScript doesn't know about these methods
  return (auth.api as any).signOut();
};

// Auth handlers for API routes
export async function GET(request: NextRequest) {
  return auth.handler(request);
}

export async function POST(request: NextRequest) {
  return auth.handler(request);
}

// Default export for auth function that returns the session
export default async function getAuthSession() {
  return await getSession();
}

// Export getSession
export { getSession };

