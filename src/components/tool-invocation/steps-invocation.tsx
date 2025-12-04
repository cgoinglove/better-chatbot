"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Steps, StepsItem } from "@/components/ui/steps";
import { JsonViewPopup } from "../json-view-popup";

// Steps invocation props interface matching tool schema
export interface StepsInvocationProps {
  title: string;
  description?: string;
  steps: Array<{
    title: string;
    details: string;
    number?: number;
  }>;
}

export function StepsInvocation(props: StepsInvocationProps) {
  const { title, description, steps } = props;

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-col gap-2 relative">
        <CardTitle className="flex items-center">
          Steps - {title}
          <div className="absolute right-4 top-0">
            <JsonViewPopup data={props} />
          </div>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Steps>
          {steps.map((step, index) => (
            <StepsItem
              key={index}
              title={step.title}
              details={step.details}
              number={step.number}
            />
          ))}
        </Steps>
      </CardContent>
    </Card>
  );
}
