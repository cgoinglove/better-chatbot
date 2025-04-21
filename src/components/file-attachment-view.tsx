"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "ui/button";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import { cn } from "lib/utils";

export type FileAttachmentData = {
  id: string;
  filename: string;
  originalFilename: string;
  mimetype: string;
  url: string;
  thumbnailUrl?: string;
};

interface FileAttachmentViewProps {
  attachments: FileAttachmentData[];
  onRemove?: (id: string) => void;
  className?: string;
  compact?: boolean;
}

export function FileAttachmentView({
  attachments,
  onRemove,
  className,
  compact = false,
}: FileAttachmentViewProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleImageClick = (url: string) => {
    setExpandedImage(url);
  };

  const closeExpandedImage = () => {
    setExpandedImage(null);
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) {
      return null; // Will use thumbnail/preview instead
    }
    
    return <FileText className="h-5 w-5" />;
  };

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className={cn(
              "relative group border rounded-md overflow-hidden bg-background",
              compact ? "w-16 h-16" : "w-32"
            )}
          >
            {attachment.mimetype.startsWith("image/") ? (
              <div 
                className={cn(
                  "relative cursor-pointer",
                  compact ? "h-16 w-16" : "aspect-square w-full"
                )}
                onClick={() => handleImageClick(attachment.url)}
              >
                <Image
                  src={attachment.thumbnailUrl || attachment.url}
                  alt={attachment.originalFilename}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className={cn(
                "flex flex-col items-center justify-center bg-muted/20",
                compact ? "h-16 w-16" : "aspect-square w-full"
              )}>
                {getFileIcon(attachment.mimetype)}
                {!compact && (
                  <span className="text-xs mt-1 px-1 truncate max-w-full">
                    {attachment.originalFilename}
                  </span>
                )}
              </div>
            )}
            
            {!compact && (
              <div className="p-1 flex justify-between items-center">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
                
                <a
                  href={attachment.url}
                  download={attachment.originalFilename}
                  className="text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="h-3 w-3" />
                </a>
              </div>
            )}
            
            {onRemove && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(attachment.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={closeExpandedImage}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 z-10"
              onClick={closeExpandedImage}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
