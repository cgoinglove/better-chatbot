"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Button } from "ui/button";
import { Paperclip, X, Loader2 } from "lucide-react";
import { cn } from "lib/utils";
import { toast } from "sonner";
import Image from "next/image";

export type UploadedFile = {
  id: string;
  filename: string;
  originalFilename: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
};

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  onFileRemove?: (fileId: string) => void;
  uploadedFiles?: UploadedFile[];
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
}

export function FileUpload({
  onFileUpload,
  onFileRemove,
  uploadedFiles = [],
  multiple = false,
  accept = "image/*,application/pdf",
  maxSize = 5 * 1024 * 1024, // 5MB default
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    await uploadFiles(files);
    
    // Reset the input value so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    await uploadFiles(files);
  };

  const uploadFiles = async (files: FileList) => {
    const filesToUpload = multiple ? Array.from(files) : [files[0]];
    
    for (const file of filesToUpload) {
      // Check file size
      if (file.size > maxSize) {
        toast.error(`File ${file.name} exceeds the maximum size limit of ${formatFileSize(maxSize)}`);
        continue;
      }
      
      // Check file type if accept is specified
      if (accept && !isFileTypeAccepted(file, accept)) {
        toast.error(`File type not accepted for ${file.name}`);
        continue;
      }
      
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }
      
      const uploadedFile = await response.json();
      onFileUpload(uploadedFile);
      toast.success(`File ${file.name} uploaded successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    if (onFileRemove) {
      onFileRemove(fileId);
    }
  };

  const isFileTypeAccepted = (file: File, acceptString: string): boolean => {
    const acceptedTypes = acceptString.split(",").map(type => type.trim());
    
    return acceptedTypes.some(type => {
      if (type === "*" || type === "*/*") return true;
      
      if (type.endsWith("/*")) {
        const mainType = type.split("/")[0];
        return file.type.startsWith(`${mainType}/`);
      }
      
      return file.type === type;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) {
      return null; // Will use thumbnail/preview instead
    }
    
    // Default icon for other file types
    return <Paperclip className="h-5 w-5" />;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/20 hover:border-primary/50",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <Paperclip className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              Drag & drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {accept === "image/*" 
                ? "Supports images only" 
                : accept === "application/pdf" 
                  ? "Supports PDF files only" 
                  : "Supports various file types"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max size: {formatFileSize(maxSize)}
            </p>
          </div>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="relative group border rounded-md overflow-hidden bg-background"
            >
              {file.mimetype.startsWith("image/") && file.thumbnailUrl ? (
                <div className="aspect-square relative">
                  <Image
                    src={file.thumbnailUrl || file.url}
                    alt={file.originalFilename}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-muted/20">
                  {getFileIcon(file.mimetype)}
                </div>
              )}
              
              <div className="p-2 text-xs truncate">{file.originalFilename}</div>
              
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(file.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
