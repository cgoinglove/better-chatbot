"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { JsonViewPopup } from "../json-view-popup";
import { Markdown } from "@/components/markdown";

// Carousel invocation props interface matching tool schema
export interface CarouselInvocationProps {
  title: string;
  description?: string;
  items: Array<{
    content: React.ReactNode;
    id?: string;
  }>;
  itemsToScroll?: number;
}

export function CarouselInvocation(props: CarouselInvocationProps) {
  const { title, description, items, itemsToScroll = 1 } = props;

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-col gap-2 relative">
        <CardTitle className="flex items-center">
          Carousel - {title}
          <div className="absolute right-4 top-0">
            <JsonViewPopup data={props} />
          </div>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Carousel itemsToScroll={itemsToScroll}>
          <CarouselContent>
            {items.map((item, index) => (
              <CarouselItem
                key={item.id || index}
                className="basis-full md:basis-1/2 lg:basis-1/3"
              >
                <div className="p-4 border border-border rounded-lg bg-card h-full">
                  {typeof item.content === "string" ? (
                    <Markdown>{item.content}</Markdown>
                  ) : (
                    item.content
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </CardContent>
    </Card>
  );
}
