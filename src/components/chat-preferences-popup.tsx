import { useEffect, useState, type PropsWithChildren } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { useObjectState } from "@/hooks/use-object-state";
import { UserPreferences } from "app-types/user";
import { safe } from "ts-safe";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import { Label } from "ui/label";
import { Input } from "ui/input";
import { ExamplePlaceholder } from "ui/example-placeholder";
import { Textarea } from "ui/textarea";
import { Button } from "ui/button";
import { Loader } from "lucide-react";
import { authClient } from "auth/client";
const responseStyleExamples = [
  "eg. keep explanations brief and to the point",
  "eg. when learning new concepts, I find analogies particularly helpful",
  "eg. ask clarifying questions before giving detailed answers",
  "eg. remember I primarily code in Python (not a coding beginner)",
];

const professionExamples = [
  "eg. software engineer",
  "eg. product manager",
  "eg. marketing manager",
  "eg. sales manager",
  "eg. business analyst",
];

interface ChatPreferencesPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatPreferencesPopup({
  open,
  onOpenChange,
  children,
}: PropsWithChildren<ChatPreferencesPopupProps>) {
  const { data: session } = authClient.useSession();
  const [preferences, setPreferences] = useObjectState<UserPreferences>({
    displayName: session?.user.name || "",
    responseStyleExample: "",
    profession: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const savePreferences = async () => {
    safe(() => setIsSaving(true))
      .ifOk(() =>
        fetch("/api/user/preferences", {
          method: "PUT",
          body: JSON.stringify(preferences),
        }),
      )
      .watch((result) => {
        if (result.isOk) toast.success("Preferences saved");
        else toast.error("Failed to save preferences");
      })
      .watch(() => setIsSaving(false))
      .ifOk(() => onOpenChange(false));
  };
  const { mutate: fetchPreferences } = useSWR<UserPreferences>(
    "/api/user/preferences",
    fetcher,
    {
      fallback: {},
      onSuccess: (data) => {
        setPreferences(data);
      },
    },
  );

  useEffect(() => {
    if (open) {
      setPreferences({
        displayName: session?.user.name || "",
        responseStyleExample: "",
        profession: "",
      });
      fetchPreferences();
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent showCloseButton={false} className="md:max-w-2xl">
        <DialogTitle>Chat Preferences</DialogTitle>
        <DialogDescription>
          {/* Introduce yourself to receive more personalized responses. */}
        </DialogDescription>
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-2">
            <Label>What should we call you?</Label>
            <Input
              value={preferences.displayName}
              onChange={(e) => {
                setPreferences({
                  displayName: e.target.value,
                });
              }}
            />
          </div>

          <div className="flex flex-col gap-2 text-foreground flex-1">
            <Label>What best describes your work?</Label>
            <div className="relative w-full">
              <Input
                value={preferences.profession}
                onChange={(e) => {
                  setPreferences({
                    profession: e.target.value,
                  });
                }}
              />
              {(preferences.profession?.length ?? 0) === 0 && (
                <div className="absolute left-0 top-0 w-full h-full py-2 px-4 pointer-events-none">
                  <ExamplePlaceholder placeholder={professionExamples} />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 text-foreground">
            <Label>
              What personal preferences should be taken into account in
              responses?
            </Label>
            <span className="text-xs text-muted-foreground"></span>
            <div className="relative w-full">
              <Textarea
                className="min-h-24 max-h-44 resize-none"
                value={preferences.responseStyleExample}
                onChange={(e) => {
                  setPreferences({
                    responseStyleExample: e.target.value,
                  });
                }}
              />
              {(preferences.responseStyleExample?.length ?? 0) === 0 && (
                <div className="absolute left-0 top-0 w-full h-full py-2 px-4 pointer-events-none">
                  <ExamplePlaceholder placeholder={responseStyleExamples} />
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button disabled={isSaving} onClick={savePreferences}>
            Save
            {isSaving && <Loader className="size-4 ml-2 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
