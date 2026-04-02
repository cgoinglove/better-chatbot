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
        "flex items-center gap-1.5 rounded-md border border-yale-blue/50 bg-yale-blue/20 px-2 py-1",
        className,
      )}
    >
      <FolderIcon className="size-3 text-yale-blue" />
      <span className="text-xs font-medium text-yale-blue">{name}</span>
    </div>
  );
}
