"use client";

import { appStore } from "@/app/store";
import { LocalModelsDialog } from "@/components/local-models/local-models-dialog";
import { useChatModels } from "@/hooks/queries/use-chat-models";
import { useModelsMetadata } from "@/hooks/queries/use-models-metadata";
import { useLocalModelsAccess } from "@/hooks/use-local-models-access";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatModel } from "app-types/chat";
import { cn, fetcher } from "lib/utils";
import { CheckIcon, ChevronDown, HelpCircle } from "lucide-react";
import {
  Fragment,
  PropsWithChildren,
  memo,
  useEffect,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";
import { Button } from "ui/button";
import { Label } from "ui/label";
import { Switch } from "ui/switch";

import {
  BlockIcon,
  BrainIcon,
  CautionIcon,
  GemIcon,
  MaxIcon,
  PiggyBankIcon,
  RabbitIcon,
} from "@/components/ui/model-badge-icons";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "ui/command";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "ui/drawer";
import { ModelProviderIcon } from "ui/model-provider-icon";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "ui/tooltip";

interface SelectModelProps {
  onSelect: (model: ChatModel) => void;
  align?: "start" | "end";
  /** Preferred side of the trigger. Anchored callers (the chat composer) pass
   * "top" so the list opens over the conversation instead of under the input. */
  side?: "top" | "bottom";
  currentModel?: ChatModel;
  showProvider?: boolean;
}

// Helper function to convert country code to flag emoji
const getCountryFlag = (countryCode: string | null | undefined): string => {
  if (!countryCode) return "";

  const flags: Record<string, string> = {
    US: "🇺🇸",
    CN: "🇨🇳",
    EU: "🇪🇺",
  };

  return flags[countryCode.toUpperCase()] || "";
};

// Helper function to get badge icons with tooltips
const getBadgeIcons = (badges: {
  hiddenGem?: boolean;
  caution?: boolean;
  notRecommended?: boolean;
  cheapAlternative?: boolean;
  speed?: boolean;
  thinking?: boolean;
  maxPerformance?: boolean;
}) => {
  const icons: Array<{ icon: React.ReactElement; tooltip: string }> = [];

  if (badges.hiddenGem) {
    icons.push({
      icon: <GemIcon className="size-3.5 text-amber-500" />,
      tooltip: "Best value for money. We recommend!",
    });
  }
  if (badges.maxPerformance) {
    icons.push({
      icon: <MaxIcon className="size-3.5 text-indigo-500" />,
      tooltip: "The best model from its developer",
    });
  }
  if (badges.speed) {
    icons.push({
      icon: <RabbitIcon className="size-3.5 text-blue-500" />,
      tooltip: "Super fast. Good for the impatient.",
    });
  }
  if (badges.thinking) {
    icons.push({
      icon: <BrainIcon className="size-3.5 text-purple-500" />,
      tooltip: "Follows instructions optimally through planning and reasoning.",
    });
  }
  if (badges.cheapAlternative) {
    icons.push({
      icon: <PiggyBankIcon className="size-3.5 text-green-500" />,
      tooltip: "Cheapest but good model from same developer.",
    });
  }
  if (badges.caution) {
    icons.push({
      icon: <CautionIcon className="size-3.5 text-orange-500" />,
      tooltip: "Expensive! $10+ per 1M output tokens.",
    });
  }
  if (badges.notRecommended) {
    icons.push({
      icon: <BlockIcon className="size-3.5 text-red-500" />,
      tooltip:
        "We have it because it's popular. But it has low quality output.",
    });
  }

  return icons;
};

type FilterType = "hiddenGem" | "speed" | "thinking";

/** Flagship chat models (google, openai, anthropic) shown under "Top 3". */
const FEATURED_TOP3_MODELS: ReadonlyArray<{ provider: string; model: string }> =
  [
    { provider: "google", model: "gemini-3.1-pro-preview" },
    { provider: "openai", model: "gpt-5.6-sol" },
    { provider: "anthropic", model: "claude-sonnet-5" },
  ];

type ModelsProvider = NonNullable<
  ReturnType<typeof useChatModels>["data"]
>[number] & { isPlaceholder?: boolean };

function buildModelMenuPlan(filtered: ModelsProvider[] | undefined) {
  if (!filtered?.length) return null;

  const byProvider = new Map(filtered.map((p) => [p.provider, p]));
  const top3Key = new Set(
    FEATURED_TOP3_MODELS.map((t) => `${t.provider}\0${t.model}`),
  );

  const navigator = byProvider.get("Navigator");
  const baseModel =
    navigator?.models.some((m) => m.name === "Base model") && navigator
      ? {
          provider: navigator,
          item: navigator.models.find((m) => m.name === "Base model")!,
        }
      : null;

  const top3: Array<{
    provider: ModelsProvider;
    item: ModelsProvider["models"][number];
  }> = [];
  for (const ref of FEATURED_TOP3_MODELS) {
    const p = byProvider.get(ref.provider);
    const item = p?.models.find((m) => m.name === ref.model);
    if (p && item) top3.push({ provider: p, item });
  }

  const mistral = byProvider.get("mistral");

  const tail: ModelsProvider[] = [];
  const localPlaceholders: ModelsProvider[] = [];

  for (const p of filtered) {
    if (p.provider === "Navigator") continue;
    if (p.provider === "mistral") continue;
    if (p.provider === "Add Local Models" || p.isPlaceholder) {
      localPlaceholders.push(p);
      continue;
    }
    if (p.provider === "Local Models") {
      localPlaceholders.push(p);
      continue;
    }

    const models = p.models.filter(
      (m) => !top3Key.has(`${p.provider}\0${m.name}`),
    );
    if (models.length > 0) {
      tail.push({ ...p, models });
    }
  }

  const mistralBlock = mistral && mistral.models.length > 0 ? mistral : null;

  return {
    baseModel,
    top3,
    mistral: mistralBlock,
    tail,
    localPlaceholders,
  };
}

export const SelectModel = (props: PropsWithChildren<SelectModelProps>) => {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { data: providers } = useChatModels();
  const autoRouting = appStore((state) => state.autoRouting);
  const appStoreMutate = appStore((state) => state.mutate);
  const { data: routingAvailability } = useSWR<{
    enabled: boolean;
    candidateCount: number;
  }>("/api/chat/routing", fetcher, {
    dedupingInterval: 60_000 * 5,
    revalidateOnFocus: false,
  });
  const [model, setModel] = useState(props.currentModel);
  const [activeFilters, setActiveFilters] = useState<FilterType[]>([]);

  // NEW: Add local models dialog state
  const [showLocalModelsDialog, setShowLocalModelsDialog] = useState(false);
  const [forceConfigView, setForceConfigView] = useState(false);
  const { hasAccess } = useLocalModelsAccess();

  // Fetch metadata from database
  const { data: modelsMetadata } = useModelsMetadata();

  // Helper to get badges and country for a model
  const getModelData = (provider: string, modelName: string) => {
    // Normalize provider name for matching (remove spaces, lowercase)
    const normalizeProvider = (name: string) =>
      name.toLowerCase().replace(/\s+/g, "");

    const metadata = modelsMetadata?.find(
      (m) =>
        normalizeProvider(m.developer) === normalizeProvider(provider) &&
        m.model === modelName,
    );

    if (!metadata) return { badges: {}, country: null };

    return {
      badges: {
        hiddenGem: metadata.hiddenGem,
        caution: metadata.caution,
        notRecommended: metadata.notRecommended,
        cheapAlternative: metadata.cheapAlternative,
        speed: metadata.speed,
        thinking: metadata.thinking,
        maxPerformance: metadata.maxPerformance,
      },
      country: metadata.country,
    };
  };

  // Filter providers based on active filters
  const filteredProviders = useMemo(() => {
    if (!providers || activeFilters.length === 0) return providers;

    return providers
      .map((provider) => {
        const filteredModels = provider.models.filter((modelItem) => {
          const modelData = getModelData(provider.provider, modelItem.name);
          // Check if model has ALL active filters
          return activeFilters.every(
            (filter) => modelData.badges[filter] === true,
          );
        });

        return filteredModels.length > 0
          ? { ...provider, models: filteredModels }
          : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [providers, activeFilters, modelsMetadata]);

  const toggleFilter = (filter: FilterType) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter],
    );
  };

  const clearFilters = () => {
    setActiveFilters([]);
  };

  const hasNoResults =
    filteredProviders?.length === 0 &&
    (activeFilters.length > 0 || providers?.length === 0);

  const menuPlan = useMemo(
    () => buildModelMenuPlan(filteredProviders as ModelsProvider[] | undefined),
    [filteredProviders],
  );

  useEffect(() => {
    const modelToUse = props.currentModel ?? appStore.getState().chatModel;

    if (modelToUse) {
      setModel(modelToUse);
    }
  }, [props.currentModel]);

  function renderModelItem(
    provider: ModelsProvider,
    item: ModelsProvider["models"][number],
  ) {
    const modelData = getModelData(provider.provider, item.name);
    const badgeIcons = getBadgeIcons(modelData.badges);
    const flag = getCountryFlag(modelData.country);

    return (
      <CommandItem
        key={`${provider.provider}-${item.name}`}
        disabled={!provider.hasAPIKey}
        className="cursor-pointer"
        onSelect={() => {
          appStoreMutate({ autoRouting: false });
          setModel({
            provider: provider.provider,
            model: item.name,
          });
          props.onSelect({
            provider: provider.provider,
            model: item.name,
          });
          setOpen(false);
        }}
        value={item.name}
        data-testid={`model-option-${provider.provider}-${item.name}`}
      >
        {model?.provider === provider.provider && model?.model === item.name ? (
          <CheckIcon className="size-3" data-testid="selected-model-check" />
        ) : (
          <div className="ml-3" />
        )}
        <span className="pr-2 flex items-center gap-1">
          {item.name}
          {flag && <span className="text-sm">{flag}</span>}
        </span>

        {badgeIcons.length > 0 && (
          <div className="ml-auto flex gap-1 mr-2">
            {badgeIcons.map((badge, idx) => (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <div className="flex items-center">{badge.icon}</div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">{badge.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {item.isToolCallUnsupported && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground",
              badgeIcons.length === 0 && "ml-auto",
            )}
          >
            No tools
          </div>
        )}
      </CommandItem>
    );
  }

  function renderModelsProviderGroup(provider: ModelsProvider) {
    return (
      <CommandGroup
        heading={
          <ProviderHeader
            provider={provider.provider}
            hasAPIKey={provider.hasAPIKey}
            isPlaceholder={provider.isPlaceholder}
          />
        }
        className={cn("pb-4 group", !provider.hasAPIKey && "opacity-50")}
        onWheel={(e) => {
          e.stopPropagation();
        }}
        data-testid={`model-provider-${provider.provider}`}
      >
        {provider.isPlaceholder ? (
          <CommandItem
            className="cursor-pointer"
            onSelect={() => {
              setOpen(false);
              setForceConfigView(false);
              setShowLocalModelsDialog(true);
            }}
            data-testid="add-local-models-button"
          >
            <span className="text-sm text-primary font-medium">
              Add local Model
            </span>
          </CommandItem>
        ) : (
          provider.models.map((item) => renderModelItem(provider, item))
        )}

        {provider.provider === "Local Models" &&
          provider.hasAPIKey &&
          provider.models.length > 0 && (
            <CommandItem
              className="cursor-pointer"
              onSelect={() => {
                setOpen(false);
                setForceConfigView(true);
                setShowLocalModelsDialog(true);
              }}
              data-testid="update-local-models-button"
            >
              <span className="text-sm text-primary font-medium">Update</span>
            </CommandItem>
          )}
      </CommandGroup>
    );
  }

  function renderMistralGroup(provider: ModelsProvider) {
    return (
      <CommandGroup
        heading={
          <ProviderHeader
            provider={provider.provider}
            hasAPIKey={provider.hasAPIKey}
            isPlaceholder={provider.isPlaceholder}
          />
        }
        className={cn("pb-4 group", !provider.hasAPIKey && "opacity-50")}
        onWheel={(e) => {
          e.stopPropagation();
        }}
        data-testid={`model-provider-${provider.provider}`}
      >
        {provider.models.map((item) => renderModelItem(provider, item))}
      </CommandGroup>
    );
  }

  const trigger = props.children || (
    <Button
      variant={"secondary"}
      size={"sm"}
      className="data-[state=open]:bg-input! hover:bg-input! "
      data-testid="model-selector-button"
    >
      <div className="mr-auto flex items-center gap-1">
        {(props.showProvider ?? true) && (
          <ModelProviderIcon
            provider={model?.provider || ""}
            className="size-2.5 mr-1"
          />
        )}
        <p data-testid="selected-model-name">{model?.model || "model"}</p>
      </div>
      <ChevronDown className="size-3" />
    </Button>
  );

  const modelCommand = (
    <Command
      className={cn(
        "relative",
        isMobile ? "h-full rounded-none" : "rounded-lg shadow-md h-80",
      )}
      value={JSON.stringify(model)}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Filter Buttons */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <Label
              htmlFor="automatic-routing"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Automatic
            </Label>
            <Switch
              id="automatic-routing"
              checked={autoRouting}
              disabled={routingAvailability?.enabled === false}
              onCheckedChange={(checked) =>
                appStoreMutate({ autoRouting: checked })
              }
              data-testid="automatic-routing-toggle"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={
                  activeFilters.includes("hiddenGem") ? "default" : "outline"
                }
                className="size-8 p-0"
                onClick={() => toggleFilter("hiddenGem")}
              >
                <GemIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Hidden Gems - Best value for money</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={
                  activeFilters.includes("speed") ? "default" : "outline"
                }
                className="size-8 p-0"
                onClick={() => toggleFilter("speed")}
              >
                <RabbitIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Speed - Super fast models</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={
                  activeFilters.includes("thinking") ? "default" : "outline"
                }
                className="size-8 p-0"
                onClick={() => toggleFilter("thinking")}
              >
                <BrainIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Thinking - Reasoning capable models</p>
            </TooltipContent>
          </Tooltip>

          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-xs"
            >
              Clear
            </Button>
          )}

          {/* Help/Legend Icon */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "size-8 p-0",
                  activeFilters.length === 0 && "ml-auto",
                )}
              >
                <HelpCircle className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 text-sm">
              <div className="space-y-2">
                <h3 className="font-semibold">Model Badges</h3>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <GemIcon className="size-3.5 text-amber-500 mt-0.5" />
                    <span className="text-xs">
                      Best value for money. We recommend!
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MaxIcon className="size-3.5 text-indigo-500 mt-0.5" />
                    <span className="text-xs">
                      The best model from its developer
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <RabbitIcon className="size-3.5 text-blue-500 mt-0.5" />
                    <span className="text-xs">
                      Super fast. Good for the impatient.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BrainIcon className="size-3.5 text-purple-500 mt-0.5" />
                    <span className="text-xs">
                      Follows instructions optimally through planning and
                      reasoning.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <PiggyBankIcon className="size-3.5 text-green-500 mt-0.5" />
                    <span className="text-xs">
                      Cheapest but good model from same developer.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CautionIcon className="size-3.5 text-orange-500 mt-0.5" />
                    <span className="text-xs">
                      Expensive! $10+ per 1M output tokens.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BlockIcon className="size-3.5 text-red-500 mt-0.5" />
                    <span className="text-xs">
                      We have it because it's popular. But it has low quality
                      output.
                    </span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <CommandInput
        placeholder="search model..."
        data-testid="model-search-input"
      />
      <CommandList className="p-2">
        {hasNoResults ? (
          <div className="space-y-3 p-4 text-center text-sm text-muted-foreground">
            <p>No models match the selected filters.</p>
            {activeFilters.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <CommandEmpty>No results found.</CommandEmpty>
            {menuPlan && (
              <>
                {menuPlan.baseModel && (
                  <CommandGroup
                    heading="Base model"
                    className={cn(
                      "pb-4 group",
                      !menuPlan.baseModel.provider.hasAPIKey && "opacity-50",
                    )}
                    onWheel={(e) => {
                      e.stopPropagation();
                    }}
                    data-testid="model-section-base"
                  >
                    {renderModelItem(
                      menuPlan.baseModel.provider,
                      menuPlan.baseModel.item,
                    )}
                  </CommandGroup>
                )}
                {menuPlan.baseModel &&
                  (menuPlan.top3.length > 0 ||
                    menuPlan.mistral ||
                    menuPlan.tail.length > 0 ||
                    menuPlan.localPlaceholders.length > 0) && (
                    <CommandSeparator />
                  )}
                {menuPlan.top3.length > 0 && (
                  <CommandGroup
                    heading="Top 3"
                    className="pb-4 group"
                    onWheel={(e) => {
                      e.stopPropagation();
                    }}
                    data-testid="model-section-top3"
                  >
                    {menuPlan.top3.map(({ provider, item }) =>
                      renderModelItem(provider, item),
                    )}
                  </CommandGroup>
                )}
                {menuPlan.top3.length > 0 &&
                  (menuPlan.mistral ||
                    menuPlan.tail.length > 0 ||
                    menuPlan.localPlaceholders.length > 0) && (
                    <CommandSeparator />
                  )}
                {menuPlan.mistral && renderMistralGroup(menuPlan.mistral)}
                {menuPlan.mistral &&
                  (menuPlan.tail.length > 0 ||
                    menuPlan.localPlaceholders.length > 0) && (
                    <CommandSeparator />
                  )}
                {menuPlan.tail.map((provider, i) => (
                  <Fragment key={provider.provider}>
                    {renderModelsProviderGroup(provider)}
                    {i < menuPlan.tail.length - 1 ? <CommandSeparator /> : null}
                  </Fragment>
                ))}
                {menuPlan.tail.length > 0 &&
                  menuPlan.localPlaceholders.length > 0 && <CommandSeparator />}
                {menuPlan.localPlaceholders.map((provider, i) => (
                  <Fragment key={provider.provider}>
                    {renderModelsProviderGroup(provider)}
                    {i < menuPlan.localPlaceholders.length - 1 ? (
                      <CommandSeparator />
                    ) : null}
                  </Fragment>
                ))}
              </>
            )}
          </>
        )}
      </CommandList>
    </Command>
  );

  return (
    <TooltipProvider>
      {isMobile ? (
        // Phones get a sheet instead of an anchored popover. Anchored to a
        // composer that sits mid-screen there is no room for the list above the
        // input, so Radix flipped it below — half of it landing behind the
        // browser toolbar, and re-anchoring (jumping) whenever a scroll
        // collapsed that toolbar. A sheet is fixed to the viewport, so it can
        // neither be clipped nor move while open.
        <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent
            className="h-[70dvh] p-0"
            data-testid="model-selector-popover"
          >
            <DrawerTitle className="sr-only">Select model</DrawerTitle>
            <div className="min-h-0 flex-1 pt-2">{modelCommand}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent
            className="p-0 w-[320px] max-w-[calc(100vw-1rem)]"
            align={props.align || "end"}
            side={props.side}
            collisionPadding={12}
            data-testid="model-selector-popover"
          >
            {modelCommand}
          </PopoverContent>
        </Popover>
      )}

      {/* NEW: Add local models dialog */}
      <LocalModelsDialog
        open={showLocalModelsDialog}
        onOpenChange={setShowLocalModelsDialog}
        hasAccess={forceConfigView || hasAccess}
      />
    </TooltipProvider>
  );
};

const ProviderHeader = memo(function ProviderHeader({
  provider,
  hasAPIKey,
  isPlaceholder,
}: {
  provider: string;
  hasAPIKey: boolean;
  isPlaceholder?: boolean;
}) {
  return (
    <div className="text-sm text-muted-foreground flex items-center gap-1.5 group-hover:text-foreground transition-colors duration-300">
      {provider === "openai" ? (
        <ModelProviderIcon
          provider="openai"
          className="size-3 text-foreground"
        />
      ) : (
        <ModelProviderIcon provider={provider} className="size-3" />
      )}
      {provider}
      {!hasAPIKey && !isPlaceholder && (
        <>
          <span className="text-xs ml-auto text-muted-foreground">
            No API Key
          </span>
        </>
      )}
    </div>
  );
});
