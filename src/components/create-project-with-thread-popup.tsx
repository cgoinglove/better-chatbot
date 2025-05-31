"use client";
import {
  Lightbulb,
  Loader,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronsUpDown,
  WandSparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";

import { Button } from "ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import { SelectModel } from "./select-model";
import { myProvider } from "lib/ai/models";
import { cn } from "lib/utils";
import { appStore } from "@/app/store";
import { useObjectState } from "@/hooks/use-object-state";
import { safe } from "ts-safe";

import { useCompletion } from "@ai-sdk/react";
import { handleErrorWithToast } from "ui/shared-toast";
import { toast } from "sonner";
import { mutate } from "swr";
import { insertProjectAction } from "@/app/api/chat/actions";

interface CreateProjectWithThreadPopupProps {
  threadId: string;
  onClose?: () => void;
}

function ProjectNameStep({
  name,
  setName,
  nextStep,
}: {
  name: string;
  setName: (name: string) => void;
  nextStep: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2">
        <Input
          autoFocus
          id="name"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              nextStep();
            }
          }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="eg. Korea Trip Plan"
          className="w-full"
        />
      </div>

      <div className="pt-4 flex justify-end mt-auto">
        <DialogClose asChild>
          <Button variant="ghost" className="mr-2">
            Cancel
          </Button>
        </DialogClose>
        <Button onClick={nextStep} disabled={!name.trim()} className="gap-1">
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function InstructionsStep({
  systemPrompt,
  setSystemPrompt,
  prevStep,
  onSave,
  threadId,
}: {
  systemPrompt: string;
  setSystemPrompt: (systemPrompt: string) => void;
  threadId: string;
  prevStep: () => void;
  onSave: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const currentModelName = appStore((state) => state.model);
  const [model, setModel] = useState(currentModelName);
  const modelList = useMemo(() => myProvider.modelsInfo, []);

  const { complete, completion } = useCompletion({
    api: "/api/chat/summarize",
  });

  useEffect(() => {
    setSystemPrompt(completion);
  }, [completion]);

  const generateInstructions = () => {
    safe(() => setIsLoading(true))
      .map(() =>
        complete("", {
          body: {
            threadId,
            model,
          },
        }),
      )
      .watch(() => setIsLoading(false))
      .ifFail(handleErrorWithToast);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center gap-2">
        <Button
          onClick={generateInstructions}
          className="rounded-full flex-1 flex items-center gap-2 border border-accent"
        >
          {isLoading ? (
            <Loader className="size-3.5 animate-spin" />
          ) : (
            <WandSparkles className="size-3.5" />
          )}
          Generate With AI
        </Button>
        <SelectModel
          model={model}
          onSelect={setModel}
          providers={modelList}
          align="end"
        >
          <Button variant="ghost" className="gap-1 justify-between min-w-24">
            <span>{model}</span>
            <ChevronsUpDown className="size-3.5" />
          </Button>
        </SelectModel>
      </div>

      <div className="flex justify-between items-center mb-2 mt-6">
        <Label htmlFor="instructions" className="text-sm">
          Instructions
        </Label>
      </div>
      <Textarea
        id="instructions"
        value={systemPrompt}
        disabled={isLoading}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder="e.g. You are a Korean travel guide ChatBot. Respond only in Korean, include precise times for every itinerary item, and present transportation, budget, and dining recommendations succinctly in a table format."
        className="resize-none flex-1 overflow-y-auto w-full"
      />

      <div className="flex justify-between mt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={prevStep}
          className="gap-1"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant="secondary"
            disabled={isLoading || !systemPrompt.trim()}
            onClick={onSave}
            className="gap-1"
          >
            {isLoading && <Loader className="size-4 animate-spin" />}
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CreateProjectWithThreadPopup({
  threadId,
  children,
  onClose,
}: PropsWithChildren<CreateProjectWithThreadPopupProps>) {
  const [isOpen, setIsOpen] = useState(false);

  const [projectOption, setProjectOption] = useObjectState({
    name: "",
    instructions: "",
    currentStep: 1,
    isLoading: false,
  });

  const router = useRouter();

  const prevStep = () => {
    if (projectOption.currentStep > 1) {
      setProjectOption({
        currentStep: projectOption.currentStep - 1,
      });
    }
  };
  const nextStep = () => {
    if (projectOption.currentStep < steps.length) {
      setProjectOption({
        currentStep: projectOption.currentStep + 1,
      });
    }
  };

  const handleCreate = async () => {
    safe(() => setProjectOption({ isLoading: true }))
      .map(() =>
        insertProjectAction({
          name: projectOption.name,
          instructions: {
            systemPrompt: projectOption.instructions,
          },
        }),
      )
      .ifOk(() => setIsOpen(false))
      .ifOk(() => toast.success("Project created"))
      .ifOk(() => mutate("projects"))
      .ifOk(() => onClose?.())
      .ifOk((project) => router.push(`/project/${project.id}`))
      .watch(() => setProjectOption({ isLoading: false }))
      .ifFail(handleErrorWithToast);
  };
  const steps = useMemo(
    () => [
      {
        id: 1,
        title: "Project Name",
        description: "Enter a name for your new project",
      },
      {
        id: 2,
        title: "Instructions",
        description: "Provide custom instructions for your project assistant",
      },
    ],
    [],
  );

  const currentStepContent = useMemo(() => {
    return steps.find((step) => step.id === projectOption.currentStep);
  }, [projectOption.currentStep]);

  useEffect(() => {
    if (!isOpen) {
      setProjectOption({
        name: "",
        instructions: "",
        currentStep: 1,
      });
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          onClose?.();
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] p-0 bg-card overflow-hidden">
        <DialogTitle className="p-0 m-0 hidden">Create Project</DialogTitle>

        <div className="flex h-[60vh]">
          <div className="w-1/3 bg-muted p-6 flex flex-col">
            <div className="text-xl font-bold mb-6">Create Project</div>

            <div className="flex-1">
              {steps.map((step) => (
                <div key={step.id} className="flex flex-col relative pb-4">
                  <div className="flex items-start mb-2">
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full w-6 h-6 text-sm font-medium border-2 transition-colors mr-3 flex-shrink-0",
                        projectOption.currentStep < step.id
                          ? "border-muted-foreground/30 text-muted-foreground/50"
                          : "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {projectOption.currentStep > step.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "font-medium",
                          projectOption.currentStep === step.id
                            ? "text-foreground"
                            : "text-muted-foreground/70",
                        )}
                      >
                        {step.title}
                      </span>
                      <span
                        className={cn(
                          "text-xs mt-0.5",
                          projectOption.currentStep === step.id
                            ? "text-muted-foreground"
                            : "text-muted-foreground/50",
                        )}
                      >
                        {step.description}
                      </span>
                    </div>
                  </div>

                  {step.id < steps.length && (
                    <div className="absolute h-[calc(100%-32px)] w-0.5 bg-muted-foreground left-[11px] top-7" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-auto">
              <div className="p-4 bg-background/50 rounded-lg">
                <div className="flex items-start">
                  <Lightbulb className="size-4 text-accent-foreground mt-1 mr-2 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold text-accent-foreground mb-1">
                      What is a project?
                    </p>
                    A project allows you to organize your files and custom
                    instructions in one convenient place.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-2/3 p-6 flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-semibold">
                {currentStepContent?.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStepContent?.description}
              </p>
            </div>

            {currentStepContent?.id === 1 && (
              <ProjectNameStep
                name={projectOption.name}
                setName={(name) => setProjectOption({ name })}
                nextStep={nextStep}
              />
            )}
            {currentStepContent?.id === 2 && (
              <InstructionsStep
                threadId={threadId}
                systemPrompt={projectOption.instructions}
                setSystemPrompt={(instructions) =>
                  setProjectOption({ instructions })
                }
                prevStep={prevStep}
                onSave={handleCreate}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
