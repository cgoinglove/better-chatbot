"use client";

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

// Client-side component for signing out
export const SignOutForm = () => {
  const router = useRouter();
  
  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
  };
  
  return (
    <button
      onClick={handleSignOut}
      className="w-full text-left px-1 py-0.5 text-red-500"
    >
      Sign out
    </button>
  );
};
