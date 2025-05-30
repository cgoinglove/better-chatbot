import { auth } from '@/app/(auth)/auth';
import { headers } from 'next/headers';
import { getChatsByUserId } from '@/lib/db/queries';

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  const chats = await getChatsByUserId({ id: session.user.id! });
  return Response.json(chats);
}
