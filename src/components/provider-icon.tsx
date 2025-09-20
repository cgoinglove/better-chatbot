import { ClaudeIcon } from "ui/claude-icon";
import { OpenAIIcon } from "ui/openai-icon";
import { GrokIcon } from "ui/grok-icon";
import { GeminiIcon } from "ui/gemini-icon";
import { Cpu } from "lucide-react";

export function ProviderIcon({
  provider,
  className,
}: { provider: string; className?: string }) {
  switch (provider) {
    case "openai":
      return <OpenAIIcon className={className} />;
    case "anthropic":
      return <ClaudeIcon className={className} />;
    case "google":
      return <GeminiIcon className={className} />;
    case "xai":
      return <GrokIcon className={className} />;
    default:
      return <Cpu className={className} />;
  }
}
