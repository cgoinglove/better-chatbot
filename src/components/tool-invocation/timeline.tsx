"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import * as LucideIcons from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JsonViewPopup } from "../json-view-popup";

// Timeline component props interface matching tool schema
export interface TimelineProps {
  title: string;
  description?: string;
  events: Array<{
    title: string;
    description?: string;
    timestamp: string;
    status: "pending" | "in-progress" | "complete";
    icon?: string;
  }>;
}

// Status configurations
const statusConfig = {
  complete: {
    color: "bg-green-500",
    ringColor: "ring-green-500/20",
    textColor: "text-green-600 dark:text-green-400",
    label: "Complete",
    badgeVariant: "default" as const,
  },
  "in-progress": {
    color: "bg-blue-500",
    ringColor: "ring-blue-500/20",
    textColor: "text-blue-600 dark:text-blue-400",
    label: "In Progress",
    badgeVariant: "secondary" as const,
  },
  pending: {
    color: "bg-transparent border-2 border-gray-400 dark:border-gray-500",
    ringColor: "ring-gray-400/20",
    textColor: "text-gray-600 dark:text-gray-400",
    label: "Pending",
    badgeVariant: "outline" as const,
  },
};

// Animation variants for stagger effect
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // 100ms delay between items
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

// Helper to format timestamp
function formatTimestamp(timestamp: string): string {
  try {
    const date = parseISO(timestamp);
    const distance = formatDistanceToNow(date, { addSuffix: true });
    return distance;
  } catch (_error) {
    // If not ISO format, return as-is (e.g., "Yesterday", "2 hours ago")
    return timestamp;
  }
}

// Helper to get Lucide icon component
function getIconComponent(iconName?: string) {
  if (!iconName) return null;

  // Convert iconName to PascalCase if needed and get from lucide-react
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent || null;
}

export function Timeline(props: TimelineProps) {
  const { title, description, events } = props;

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-col gap-2 relative">
        <CardTitle className="flex items-center">
          Timeline - {title}
          <div className="absolute right-4 top-0">
            <JsonViewPopup data={props} />
          </div>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <motion.div
          className="relative"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Vertical connecting line */}
          <div
            className="absolute left-[9px] top-0 bottom-0 w-[2px] bg-border"
            style={{ height: "calc(100% - 24px)" }}
          />

          {/* Timeline events */}
          <div className="space-y-6">
            {events.map((event, index) => {
              const config = statusConfig[event.status];
              const IconComponent = getIconComponent(event.icon);
              const _isLast = index === events.length - 1;

              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="relative pl-8 pb-2"
                >
                  {/* Status indicator dot */}
                  <div
                    className={cn(
                      "absolute left-0 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4",
                      config.color,
                      config.ringColor,
                    )}
                  >
                    {IconComponent && (
                      <IconComponent className="w-3 h-3 text-white" />
                    )}
                  </div>

                  {/* Event content */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground">
                        {event.title}
                      </h4>
                      <Badge
                        variant={config.badgeVariant}
                        className={cn("text-xs", config.textColor)}
                      >
                        {config.label}
                      </Badge>
                    </div>

                    {event.description && (
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
