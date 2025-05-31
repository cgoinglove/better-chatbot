import { cookies } from 'next/headers';

import ChatBot from '@/components/chat-bot';
import { DEFAULT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelFromCookie = cookieStore.get('chat-model');

  return (
    <>
      <ChatBot
        key={id}
        threadId={id}
        initialMessages={[]}
        selectedChatModel={modelFromCookie?.value || DEFAULT_MODEL}
      />
      <DataStreamHandler id={id} />
    </>  
  );
}
