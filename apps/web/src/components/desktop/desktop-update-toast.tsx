"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, DownloadCloud, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";

const TOAST_ID = "desktop-update";

function AvailableToast({ version }: { version: string }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border bg-card p-3 shadow-lg",
        "ring-1 ring-border/60",
      )}
    >
      <DownloadCloud className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">
          New update available
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Version {version} is ready to download.
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-2 h-7 px-2 text-xs"
          onClick={() => void window.desktop?.updates?.downloadAndInstall()}
        >
          Update now
        </Button>
      </div>
    </div>
  );
}

function DownloadingToast({
  version,
  percent,
}: {
  version: string;
  percent: number;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border bg-card p-3 shadow-lg",
        "ring-1 ring-border/60",
      )}
    >
      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">
          Downloading update {version}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {Math.round(percent)}% — the app will restart automatically when
          ready.
        </p>
      </div>
    </div>
  );
}

function InstallingToast() {
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border bg-card p-3 shadow-lg",
        "ring-1 ring-border/60",
      )}
    >
      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">Installing update</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Restarting the app…
        </p>
      </div>
    </div>
  );
}

function ErrorToast({ message }: { message: string }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border bg-card p-3 shadow-lg",
        "ring-1 ring-border/60",
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">Update failed</p>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function renderUpdateToast(state: DesktopUpdateState): void {
  switch (state.status) {
    case "available":
      toast.custom(() => <AvailableToast version={state.version} />, {
        id: TOAST_ID,
        position: "bottom-left",
        duration: Infinity,
      });
      return;
    case "downloading":
      toast.custom(
        () => (
          <DownloadingToast version={state.version} percent={state.percent} />
        ),
        { id: TOAST_ID, position: "bottom-left", duration: Infinity },
      );
      return;
    case "downloaded":
      toast.custom(() => <InstallingToast />, {
        id: TOAST_ID,
        position: "bottom-left",
        duration: Infinity,
      });
      return;
    case "error":
      toast.custom(() => <ErrorToast message={state.message} />, {
        id: TOAST_ID,
        position: "bottom-left",
        duration: 8000,
      });
      return;
    case "idle":
    case "checking":
    case "not-available":
      return;
  }
}

/** Listens for Electron auto-updater state and surfaces a bottom-left toast. Desktop app only. */
export function DesktopUpdateNotifier() {
  useEffect(() => {
    const updates = window.desktop?.updates;
    if (!updates) return;

    void updates.getState().then(renderUpdateToast);
    const unsubscribe = updates.onStateChange(renderUpdateToast);
    return unsubscribe;
  }, []);

  return null;
}
