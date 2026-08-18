import { Card, CardContent, CardHeader } from "ui/card";
import { Skeleton } from "ui/skeleton";

export default function UsageLoading() {
  return (
    <div className="relative bg-background w-full flex flex-col min-h-screen">
      <div className="flex-1 overflow-y-auto p-6 w-full">
        <div className="space-y-6 w-full max-w-none">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-40" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="bg-card">
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[260px] w-full" />
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[260px] w-full" />
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="w-full border-none bg-transparent">
            <CardHeader>
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="p-2 md:p-6 w-full space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
