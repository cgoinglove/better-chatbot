"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Library } from "app-types/library";

export default function RAGUploadPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch libraries on component mount
  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const response = await fetch("/api/library");
        if (!response.ok) {
          throw new Error("Failed to fetch libraries");
        }
        
        const data = await response.json();
        setLibraries(data);
        
        if (data.length > 0) {
          setSelectedLibraryId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching libraries:", error);
        toast.error("Failed to fetch libraries");
      }
    };
    
    fetchLibraries();
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Use file name as title if title is empty
      if (!title) {
        setTitle(selectedFile.name);
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLibraryId) {
      toast.error("Please select a library");
      return;
    }
    
    if (!title) {
      toast.error("Title is required");
      return;
    }
    
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append("libraryId", selectedLibraryId);
      formData.append("title", title);
      formData.append("file", file);
      if (description) formData.append("description", description);
      
      const response = await fetch("/api/rag/ingest", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to upload document");
      }
      
      const document = await response.json();
      toast.success(`Document "${document.title}" uploaded and ingested successfully`);
      
      // Reset form
      setTitle("");
      setDescription("");
      setFile(null);
      
      // Redirect to RAG page
      router.push("/rag?tab=documents");
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Upload Document</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Upload Document for RAG</CardTitle>
          <CardDescription>
            Upload a document to be processed and indexed for semantic search
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Library</label>
              <Select value={selectedLibraryId} onValueChange={setSelectedLibraryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a library" />
                </SelectTrigger>
                <SelectContent>
                  {libraries.map((library) => (
                    <SelectItem key={library.id} value={library.id}>
                      {library.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description (Optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Document description"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">File</label>
              <Input
                type="file"
                onChange={handleFileChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported file types: .txt, .md, .pdf, .docx (text extraction from PDF and DOCX is limited in this demo)
              </p>
            </div>
            
            {file && (
              <div className="text-sm">
                <p>Selected file: {file.name}</p>
                <p>Size: {(file.size / 1024).toFixed(2)} KB</p>
                <p>Type: {file.type}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Uploading..." : "Upload and Ingest"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
