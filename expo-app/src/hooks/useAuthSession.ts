import { authClient } from "@/lib/auth";

export function useAuthSession() {
  const session = authClient.useSession();

  return {
    data: session.data,
    user: session.data?.user,
    isPending: session.isPending,
    refetch: session.refetch,
  };
}
