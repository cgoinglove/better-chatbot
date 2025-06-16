import { cn } from "lib/utils";
import { TriangleAlertIcon, VariableIcon, XIcon } from "lucide-react";

export function VariableMentionItem({
  nodeName,
  path,
  notFound,
  onRemove,
}: {
  nodeName: string;
  path: string[];
  notFound?: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        notFound ? "hover:border-destructive" : "hover:border-blue-500",
        "border max-w-40 gap-1 flex items-center text-xs px-2 rounded-sm bg-background",
      )}
    >
      {notFound ? (
        <TriangleAlertIcon className="text-destructive size-2.5" />
      ) : (
        <VariableIcon className="text-blue-500 size-2.5" />
      )}

      <span>{nodeName}/</span>

      <span
        className={cn(
          notFound ? "text-destructive" : "text-blue-500",
          "min-w-0 truncate flex-1",
        )}
      >
        {path.join(".")}
      </span>
      <XIcon
        className="text-muted-foreground size-2.5 cursor-pointer"
        onClick={onRemove}
      />
    </div>
  );
}
