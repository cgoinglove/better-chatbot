"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Library } from "app-types/library";
import { Document, SearchResult } from "app-types/rag";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function RAGPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [hybridSearch, setHybridSearch] = useState(false);
  const [keywordWeight, setKeywordWeight] = useState(0.3);
  const [filters, setFilters] = useState({
    mimeType: "",
    fileType: "",
    author: "",
    minWordCount: "",
    maxWordCount: "",
  });
  const [showFilters, setShowFilters] = useState(false);

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

  // Fetch documents when library changes
  useEffect(() => {
    if (selectedLibraryId) {
      fetchDocuments(selectedLibraryId);
    }
  }, [selectedLibraryId]);

  const fetchDocuments = async (libraryId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/rag/documents?libraryId=${libraryId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }

      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIngestText = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLibraryId) {
      toast.error("Please select a library");
      return;
    }

    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }

    try {
      setIsLoading(true);

      const formData = new FormData();
      formData.append("libraryId", selectedLibraryId);
      formData.append("title", title);
      formData.append("content", content);
      if (description) formData.append("description", description);

      const response = await fetch("/api/rag/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to ingest text");
      }

      const document = await response.json();
      toast.success(`Text "${document.title}" ingested successfully`);

      // Reset form
      setTitle("");
      setDescription("");
      setContent("");

      // Refresh documents
      fetchDocuments(selectedLibraryId);
    } catch (error) {
      console.error("Error ingesting text:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to ingest text",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query) {
      toast.error("Please enter a search query");
      return;
    }

    try {
      setIsLoading(true);

      const url = new URL("/api/rag/query", window.location.origin);
      url.searchParams.append("q", query);

      if (selectedLibraryId) {
        url.searchParams.append("libraryId", selectedLibraryId);
      }

      // Add hybrid search parameters
      if (hybridSearch) {
        url.searchParams.append("hybridSearch", "true");
        url.searchParams.append("keywordWeight", keywordWeight.toString());
      }

      // Add filters
      if (filters.mimeType) {
        url.searchParams.append("mimeType", filters.mimeType);
      }

      if (filters.fileType) {
        url.searchParams.append("fileType", filters.fileType);
      }

      if (filters.author) {
        url.searchParams.append("author", filters.author);
      }

      if (filters.minWordCount) {
        url.searchParams.append("minWordCount", filters.minWordCount);
      }

      if (filters.maxWordCount) {
        url.searchParams.append("maxWordCount", filters.maxWordCount);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to search");
      }

      const results = await response.json();
      setSearchResults(results);

      if (results.length === 0) {
        toast.info(`No results found for "${query}"`);
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error(error instanceof Error ? error.message : "Failed to search");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/rag/documents?id=${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to delete document");
      }

      toast.success("Document deleted successfully");

      // Refresh documents
      fetchDocuments(selectedLibraryId);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete document",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">RAG System</h1>

      <div className="mb-6">
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

      <Tabs defaultValue="ingest">
        <TabsList className="mb-4">
          <TabsTrigger value="ingest">Ingest Content</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="ingest">
          <Card>
            <CardHeader>
              <CardTitle>Ingest Text Content</CardTitle>
              <CardDescription>
                Add text content to your RAG system for semantic search
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleIngestText}>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description (Optional)
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Document description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Content
                  </label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter the text content to ingest"
                    rows={10}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Ingesting..." : "Ingest Content"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Search Content</CardTitle>
              <CardDescription>
                Search for relevant information in your RAG system
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSearch}>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Search Query
                  </label>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter your search query"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hybridSearch"
                      checked={hybridSearch}
                      onChange={(e) => setHybridSearch(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="hybridSearch" className="text-sm">
                      Hybrid Search
                    </label>
                  </div>

                  {hybridSearch && (
                    <div className="flex items-center space-x-2">
                      <label htmlFor="keywordWeight" className="text-sm">
                        Keyword Weight:
                      </label>
                      <input
                        type="range"
                        id="keywordWeight"
                        min="0"
                        max="1"
                        step="0.1"
                        value={keywordWeight}
                        onChange={(e) =>
                          setKeywordWeight(parseFloat(e.target.value))
                        }
                        className="w-24"
                      />
                      <span className="text-xs">{keywordWeight}</span>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 border rounded-md">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        MIME Type
                      </label>
                      <Input
                        name="mimeType"
                        value={filters.mimeType}
                        onChange={handleFilterChange}
                        placeholder="e.g., text/plain, application/pdf"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        File Type
                      </label>
                      <Input
                        name="fileType"
                        value={filters.fileType}
                        onChange={handleFilterChange}
                        placeholder="e.g., .txt, .pdf, .docx"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Author
                      </label>
                      <Input
                        name="author"
                        value={filters.author}
                        onChange={handleFilterChange}
                        placeholder="Document author"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Min Words
                        </label>
                        <Input
                          name="minWordCount"
                          type="number"
                          value={filters.minWordCount}
                          onChange={handleFilterChange}
                          placeholder="Minimum"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Max Words
                        </label>
                        <Input
                          name="maxWordCount"
                          type="number"
                          value={filters.maxWordCount}
                          onChange={handleFilterChange}
                          placeholder="Maximum"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="mt-4">
                  {isLoading ? "Searching..." : "Search"}
                </Button>
              </CardContent>
            </form>

            {searchResults.length > 0 && (
              <CardContent>
                <h3 className="text-lg font-semibold mb-4">Search Results</h3>
                <div className="space-y-4">
                  {searchResults.map((result) => (
                    <Card key={result.chunkId}>
                      <CardHeader>
                        <CardTitle>{result.documentTitle}</CardTitle>
                        <CardDescription>
                          Relevance Score: {result.score.toFixed(2)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {result.documentMetadata && (
                          <div className="mb-2 text-sm text-gray-500">
                            {result.documentMetadata.author && (
                              <div>
                                Author: {result.documentMetadata.author}
                              </div>
                            )}
                            {result.documentMetadata.fileType && (
                              <div>
                                File Type: {result.documentMetadata.fileType}
                              </div>
                            )}
                            {result.documentMetadata.wordCount && (
                              <div>
                                Word Count: {result.documentMetadata.wordCount}
                              </div>
                            )}
                            {result.documentMetadata.creationDate && (
                              <div>
                                Created:{" "}
                                {new Date(
                                  result.documentMetadata.creationDate,
                                ).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap p-4 bg-gray-50 rounded-md">
                          {result.content}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Manage your documents in the RAG system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="text-center py-4">
                  No documents found in this library
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{doc.title}</CardTitle>
                            {doc.description && (
                              <CardDescription>
                                {doc.description}
                              </CardDescription>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <p>
                            Created: {new Date(doc.createdAt).toLocaleString()}
                          </p>
                          {doc.mimeType && <p>Type: {doc.mimeType}</p>}
                          {doc.size && <p>Size: {doc.size} bytes</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
