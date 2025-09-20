import { Button } from "ui/button";
import { ArrowLeft } from "lucide-react";

export function BackButtonSkeleton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="hover:bg-muted opacity-50 cursor-not-allowed"
      disabled
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to Users
    </Button>
  );
}
