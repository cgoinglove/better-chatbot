"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageGallery, type ImageItem } from "@/components/ui/image-gallery";
import { JsonViewPopup } from "../json-view-popup";

// Gallery invocation props interface matching tool schema
export interface GalleryInvocationProps {
  title: string;
  description?: string;
  images: ImageItem[];
}

export function GalleryInvocation(props: GalleryInvocationProps) {
  const { title, description, images } = props;

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-col gap-2 relative">
        <CardTitle className="flex items-center">
          Gallery - {title}
          <div className="absolute right-4 top-0">
            <JsonViewPopup data={props} />
          </div>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ImageGallery images={images} />
      </CardContent>
    </Card>
  );
}
