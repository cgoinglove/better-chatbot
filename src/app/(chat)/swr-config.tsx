"use client";
import { SWRConfig } from "swr";

export function SWRConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        focusThrottleInterval: 30000,
        dedupingInterval: 2000,
        errorRetryCount: 1,
      }}
    >
      {children}
    </SWRConfig>
  );
}
