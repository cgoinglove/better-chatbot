import { cn } from "lib/utils";

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ children, className }: FormGroupProps) {
  return (
    <div
      className={cn(
        "space-y-2 pb-4 border-b border-border/30 last:border-b-0 last:pb-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
