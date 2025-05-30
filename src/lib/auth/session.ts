/**
 * Utility functions to adapt Better Auth sessions to be compatible with NextAuth
 */

import { getSession } from './server';

/**
 * Session compatibility layer to handle differences between NextAuth and Better Auth
 */
export type CompatibleSession = {
  id?: string;
  userId?: string;
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
  // Add any other properties needed for compatibility
};

/**
 * Gets a NextAuth-compatible session
 * This normalizes the session structure between NextAuth and Better Auth
 */
export async function getCompatibleSession(): Promise<CompatibleSession | null> {
  const session = await getSession();
  
  if (!session) return null;
  
  // Create a NextAuth compatible session from Better Auth session
  return {
    ...session,
    user: {
      id: (session as any).userId || (session as any).user?.id || '',
      email: (session as any).email || (session as any).user?.email,
      name: (session as any).name || (session as any).user?.name,
    },
  };
}

/**
 * Gets user ID from a session, handling either session format
 */
export function getUserId(session: any): string | undefined {
  if (!session) return undefined;
  
  // Try to get user ID from various possible locations
  return session.user?.id || session.userId;
}
