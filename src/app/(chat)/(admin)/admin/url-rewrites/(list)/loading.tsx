import { Skeleton } from "ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-lg border bg-card w-full p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
