import { FolderIcon } from "lucide-react";
import { cn } from "lib/utils";

interface ProjectBadgeProps {
  name: string;
  className?: string;
}

export function ProjectBadge({ name, className }: ProjectBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-blue-700/50 bg-blue-900/30 px-2 py-1",
        className,
      )}
    >
      <FolderIcon className="size-3 text-blue-400" />
      <span className="text-xs font-medium text-blue-400">{name}</span>
    </div>
  );
}
