'use client';

import { Artifact } from './artifact';
import { useArtifactSelector } from '@/hooks/use-artifact';

export function ArtifactWrapper() {
  const isVisible = useArtifactSelector((state) => state.isVisible);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto max-w-[90vw] max-h-[90vh] w-full h-full">
        <Artifact
          chatId=""
          input=""
          setInput={() => Promise.resolve()}
          handleSubmit={() => Promise.resolve()}
          status="ready"
          stop={() => Promise.resolve()}
          attachments={[]}
          setAttachments={() => {}}
          append={() => Promise.resolve('')}
          messages={[]}
          setMessages={() => {}}
          reload={() => Promise.resolve('')}
          votes={[]}
          isReadonly={false}
        />
      </div>
    </div>
  );
}
