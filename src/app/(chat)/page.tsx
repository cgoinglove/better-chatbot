import { cookies } from 'next/headers';

import ChatBot from '@/components/chat-bot';
import { DEFAULT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelFromCookie = cookieStore.get('chat-model');
  const toolChoiceFromCookie = cookieStore.get('tool-choice');

  return (
    <ChatBot
      key={id}
      threadId={id}
      initialMessages={[]}
      selectedModel={modelFromCookie?.value || DEFAULT_MODEL}
      selectedToolChoice={(toolChoiceFromCookie?.value as "auto" | "none" | "manual") || 'auto'}
    />
  );
}
