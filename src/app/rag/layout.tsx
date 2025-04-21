import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RAGLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">RAG System</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/rag">Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/rag/upload">Upload Document</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/library">Manage Libraries</Link>
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
