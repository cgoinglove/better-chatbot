"use client";
import {
  MCPResourceInfo,
  MCPResourceTemplateInfo,
  MCPResourceContent,
} from "app-types/mcp";
import { PropsWithChildren, ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Separator } from "ui/separator";
import { Button } from "ui/button";
import { Loader, Eye, EyeOff, Copy, CheckCircle } from "lucide-react";
import { handleErrorWithToast } from "ui/shared-toast";
import { Tooltip, TooltipTrigger, TooltipContent } from "ui/tooltip";
import { Badge } from "ui/badge";

export const ResourceDetailPopup = ({
  resource,
  children,
  serverId,
}: PropsWithChildren<{
  resource: MCPResourceInfo | MCPResourceTemplateInfo;
  serverId: string;
}>) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogPortal>
        <DialogContent className="sm:max-w-[900px] fixed p-10 overflow-hidden">
          <ResourceDetailPopupContent resource={resource} serverId={serverId} />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export function ResourceDetailPopupContent({
  resource,
  title,
  serverId,
}: {
  resource: MCPResourceInfo | MCPResourceTemplateInfo;
  title?: ReactNode;
  serverId: string;
}) {
  const [resourceContent, setResourceContent] = useState<
    MCPResourceContent[] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [copied, setCopied] = useState(false);

  const isTemplate = "uriTemplate" in resource;
  const uri = isTemplate ? resource.uriTemplate : resource.uri;
  const resourceName = resource.name;
  const resourceDescription =
    resource.description || "No description available";

  const fetchResourceContent = async () => {
    if (isTemplate) {
      setError(
        "Cannot fetch content for resource templates. Templates require parameters to be resolved.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/mcp/resource", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uri: resource.uri,
          serverId: serverId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch resource content");
      }

      const data = await response.json();
      setResourceContent(data.content);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch resource content",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      handleErrorWithToast(
        err instanceof Error ? err : new Error("Failed to copy to clipboard"),
      );
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="flex flex-col overflow-y-auto h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {title || resourceName}
          {isTemplate && <Badge variant="outline">Template</Badge>}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground mt-4">
          {resourceDescription}
        </DialogDescription>
      </DialogHeader>

      <Separator className="my-4" />

      {/* Resource Metadata */}
      <div className="space-y-4">
        <div>
          <h5 className="text-xs font-medium mb-2">Resource Details</h5>
          <div className="bg-card rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">URI:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-secondary px-2 py-1 rounded font-mono flex-1">
                    {uri}
                  </code>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(uri)}
                        className="h-6 w-6 p-0"
                      >
                        {copied ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy URI</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {resource.mimeType && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    MIME Type:
                  </span>
                  <p className="text-xs mt-1">{resource.mimeType}</p>
                </div>
              )}

              {!isTemplate && "size" in resource && resource.size && (
                <div>
                  <span className="text-xs text-muted-foreground">Size:</span>
                  <p className="text-xs mt-1">{formatBytes(resource.size)}</p>
                </div>
              )}

              {isTemplate && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Template Parameters:
                  </span>
                  <div className="mt-1">
                    {(() => {
                      const params = resource.uriTemplate.match(/\{([^}]+)\}/g);
                      return params ? (
                        <div className="flex flex-wrap gap-1">
                          {params.map((param, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {param}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No parameters
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resource Content Section */}
        {!isTemplate && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-medium">Resource Content</h5>
              <div className="flex items-center gap-2">
                {!showContent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowContent(true);
                      if (!resourceContent && !loading && !error) {
                        fetchResourceContent();
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Eye className="h-3 w-3 mr-1" />
                    )}
                    Load Content
                  </Button>
                )}
                {showContent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowContent(false)}
                  >
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide Content
                  </Button>
                )}
              </div>
            </div>

            {showContent && (
              <div className="bg-card rounded-lg p-4">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading content...
                    </span>
                  </div>
                )}

                {error && (
                  <div className="text-red-500 text-xs p-4 bg-red-50 rounded border">
                    <strong>Error:</strong> {error}
                  </div>
                )}

                {resourceContent && resourceContent.length > 0 && (
                  <div className="space-y-4">
                    {resourceContent.map((content, index) => (
                      <div key={index} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Content {index + 1}
                            </span>
                            {content.mimeType && (
                              <Badge variant="outline" className="text-xs">
                                {content.mimeType}
                              </Badge>
                            )}
                          </div>
                          {content.text && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(content.text!)}
                              className="h-6 px-2"
                            >
                              {copied ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>

                        {content.text ? (
                          <div className="max-h-[300px] overflow-y-auto">
                            <pre className="text-xs whitespace-pre-wrap break-words bg-secondary/50 p-3 rounded">
                              {content.text}
                            </pre>
                          </div>
                        ) : content.blob ? (
                          <div className="text-center py-4 text-muted-foreground">
                            <p className="text-xs">
                              Binary content (
                              {content.mimeType || "unknown type"})
                            </p>
                            <p className="text-xs mt-1">
                              Cannot display binary data
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No content available
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
    </div>
  );
}
