"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { InfoIcon } from "lucide-react";

import { Label } from "ui/label";
import { Checkbox } from "ui/checkbox";
import { Textarea } from "ui/textarea";
import { RadioGroup, RadioGroupItem } from "ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { Separator } from "ui/separator";
import { Switch } from "ui/switch";

import { useChatModels } from "@/hooks/queries/use-chat-models";
import { useAgents } from "@/hooks/queries/use-agents";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import { useWorkflowToolList } from "@/hooks/queries/use-workflow-tool-list";
import { AppDefaultToolkit } from "lib/ai/tools";
import { ChatMention } from "app-types/chat";
import {
  CHAT_LINK_MESSAGE_MODES,
  type ChatLinkPreset,
} from "app-types/url-rewrite";
import type { WorkflowSummary } from "app-types/workflow";
import { cn } from "lib/utils";

const VISITOR_DEFAULT_MODEL = "__visitor_default__";
const VISITOR_DEFAULT_TOOL_CHOICE = "__visitor_default__";

const TOOL_CHOICES = ["auto", "manual", "none"] as const;

const TOOL_CHOICE_LABEL_KEYS: Record<(typeof TOOL_CHOICES)[number], string> = {
  auto: "toolModeAuto",
  manual: "toolModeManual",
  none: "toolModeNone",
};

const TOOLKIT_LABEL_KEYS: Record<AppDefaultToolkit, string> = {
  [AppDefaultToolkit.Visualization]: "toolkitVisualization",
  [AppDefaultToolkit.WebSearch]: "toolkitWebSearch",
  [AppDefaultToolkit.Http]: "toolkitHttp",
  [AppDefaultToolkit.Code]: "toolkitCode",
};

function CheckboxRow({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  testId,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string | null;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-2 py-1.5",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
      data-testid={testId}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <span className="min-w-0">
        <span className="text-sm block truncate">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground block truncate">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

function MentionGroup({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: React.ReactNode[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {items.length ? (
        <div className="max-h-44 overflow-y-auto pr-1">{items}</div>
      ) : (
        <p className="text-xs text-muted-foreground/70 py-1.5">{emptyLabel}</p>
      )}
    </div>
  );
}

/**
 * Every preset key is optional, and "unset" means *keep whatever the visitor
 * already has*. Without an explicit switch that is indistinguishable from
 * "override with nothing selected", so each overridable group carries one.
 */
function OverrideSection({
  title,
  description,
  overridden,
  onOverriddenChange,
  testId,
  children,
}: {
  title: string;
  description?: string;
  overridden: boolean;
  onOverriddenChange: (overridden: boolean) => void;
  testId?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Admin.UrlRewrites");
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label>{title}</Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <label className="flex items-center gap-2 shrink-0 cursor-pointer">
          <span className="text-xs text-muted-foreground">
            {t("keepVisitorDefault")}
          </span>
          <Switch
            checked={!overridden}
            onCheckedChange={(keepDefault) => onOverriddenChange(!keepDefault)}
            data-testid={testId}
          />
        </label>
      </div>
      <div
        className={cn(
          !overridden && "opacity-50 pointer-events-none select-none",
        )}
        aria-hidden={!overridden}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Editor for the `chat` target preset. Every control here maps onto one key of
 * `ChatLinkPreset`, which in turn maps onto the visitor's `appStore` - adding a
 * new preset key means adding one control here.
 */
export function ChatPresetFields({
  preset,
  onChange,
}: {
  preset: ChatLinkPreset;
  onChange: (preset: ChatLinkPreset) => void;
}) {
  const t = useTranslations("Admin.UrlRewrites");
  const { data: providers } = useChatModels();
  const { agents } = useAgents({ filters: ["all"] });
  const { data: mcpList } = useMcpList();
  const { data: workflowList } = useWorkflowToolList();

  // Only offer what a visitor will actually be allowed to use - anything else
  // gets filtered out server-side when the link is opened.
  const shareableAgents = useMemo(
    () => agents.filter((agent) => agent.visibility === "public"),
    [agents],
  );
  const shareableWorkflows = useMemo(
    () =>
      ((workflowList ?? []) as WorkflowSummary[]).filter(
        (workflow) => workflow.visibility !== "private",
      ),
    [workflowList],
  );
  const shareableMcpServers = useMemo(
    () => (mcpList ?? []).filter((server) => server.visibility === "public"),
    [mcpList],
  );

  const mentions = preset.mentions ?? [];
  const toolkits = preset.allowedAppDefaultToolkit ?? [];

  // `undefined` on a preset key means "leave the visitor's own value alone",
  // which is why an empty array is kept rather than collapsed to undefined.
  const overridesToolkits = preset.allowedAppDefaultToolkit !== undefined;
  const overridesMentions = preset.mentions !== undefined;
  const overridesToolChoice = preset.toolChoice !== undefined;

  const hasMention = (predicate: (mention: ChatMention) => boolean) =>
    mentions.some(predicate);

  const setMentions = (next: ChatMention[]) =>
    onChange({ ...preset, mentions: next });

  const toggleMention = (mention: ChatMention, checked: boolean) => {
    const identity = (candidate: ChatMention) =>
      JSON.stringify([
        candidate.type,
        (candidate as any).agentId ??
          (candidate as any).workflowId ??
          (candidate as any).serverId ??
          candidate.name,
      ]);
    const key = identity(mention);
    setMentions(
      checked
        ? [...mentions.filter((item) => identity(item) !== key), mention]
        : mentions.filter((item) => identity(item) !== key),
    );
  };

  const selectedModel = preset.chatModel
    ? `${preset.chatModel.provider}:${preset.chatModel.model}`
    : VISITOR_DEFAULT_MODEL;

  const message = preset.message;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t("fieldModel")}</Label>
        <Select
          value={selectedModel}
          onValueChange={(value) => {
            if (value === VISITOR_DEFAULT_MODEL) {
              onChange({ ...preset, chatModel: undefined });
              return;
            }
            const [provider, ...rest] = value.split(":");
            onChange({
              ...preset,
              chatModel: { provider, model: rest.join(":") },
            });
          }}
        >
          <SelectTrigger className="w-full" data-testid="url-rewrite-model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={VISITOR_DEFAULT_MODEL}>
              {t("useVisitorDefault")}
            </SelectItem>
            {(providers ?? []).map((provider) => (
              <SelectGroupItems key={provider.provider} provider={provider} />
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {t("fieldModelDescription")}
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>{t("fieldToolMode")}</Label>
        <Select
          value={preset.toolChoice ?? VISITOR_DEFAULT_TOOL_CHOICE}
          onValueChange={(value) =>
            onChange({
              ...preset,
              toolChoice:
                value === VISITOR_DEFAULT_TOOL_CHOICE
                  ? undefined
                  : (value as ChatLinkPreset["toolChoice"]),
            })
          }
        >
          <SelectTrigger
            className="w-full"
            data-testid="url-rewrite-tool-choice"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={VISITOR_DEFAULT_TOOL_CHOICE}>
              {t("useVisitorDefault")}
            </SelectItem>
            {TOOL_CHOICES.map((choice) => (
              <SelectItem key={choice} value={choice}>
                {t(TOOL_CHOICE_LABEL_KEYS[choice] as any)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {overridesToolChoice
            ? t("fieldToolModeDescription")
            : t("fieldToolModeKeepDescription")}
        </p>
      </div>

      <Separator />

      <OverrideSection
        title={t("fieldToolkits")}
        description={t("fieldToolkitsDescription")}
        overridden={overridesToolkits}
        onOverriddenChange={(overridden) =>
          onChange({
            ...preset,
            allowedAppDefaultToolkit: overridden ? toolkits : undefined,
          })
        }
        testId="url-rewrite-override-toolkits"
      >
        <div className="grid gap-x-4 sm:grid-cols-2">
          {Object.values(AppDefaultToolkit).map((toolkit) => (
            <CheckboxRow
              key={toolkit}
              checked={toolkits.includes(toolkit)}
              disabled={!overridesToolkits}
              onCheckedChange={(checked) =>
                onChange({
                  ...preset,
                  allowedAppDefaultToolkit: checked
                    ? [...toolkits, toolkit]
                    : toolkits.filter((item) => item !== toolkit),
                })
              }
              label={t(TOOLKIT_LABEL_KEYS[toolkit] as any)}
              testId={`url-rewrite-toolkit-${toolkit}`}
            />
          ))}
        </div>
      </OverrideSection>

      <Separator />

      <OverrideSection
        title={t("fieldTools")}
        description={t("fieldToolsDescription")}
        overridden={overridesMentions}
        onOverriddenChange={(overridden) =>
          onChange({ ...preset, mentions: overridden ? mentions : undefined })
        }
        testId="url-rewrite-override-mentions"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <MentionGroup
            title={t("fieldAgents")}
            emptyLabel={t("noSharedItems")}
            items={shareableAgents.map((agent) => (
              <CheckboxRow
                key={agent.id}
                checked={hasMention(
                  (mention) =>
                    mention.type === "agent" && mention.agentId === agent.id,
                )}
                onCheckedChange={(checked) =>
                  toggleMention(
                    {
                      type: "agent",
                      name: agent.name,
                      agentId: agent.id,
                      description: agent.description,
                      icon: agent.icon,
                    },
                    checked,
                  )
                }
                label={agent.name}
                description={agent.description}
              />
            ))}
          />

          <MentionGroup
            title={t("fieldWorkflows")}
            emptyLabel={t("noSharedItems")}
            items={shareableWorkflows.map((workflow) => (
              <CheckboxRow
                key={workflow.id}
                checked={hasMention(
                  (mention) =>
                    mention.type === "workflow" &&
                    mention.workflowId === workflow.id,
                )}
                onCheckedChange={(checked) =>
                  toggleMention(
                    {
                      type: "workflow",
                      name: workflow.name,
                      workflowId: workflow.id,
                      description: workflow.description,
                      icon: workflow.icon,
                    },
                    checked,
                  )
                }
                label={workflow.name}
                description={workflow.description}
              />
            ))}
          />

          <MentionGroup
            title={t("fieldMcpServers")}
            emptyLabel={t("noSharedItems")}
            items={shareableMcpServers.map((server) => (
              <CheckboxRow
                key={server.id}
                checked={hasMention(
                  (mention) =>
                    mention.type === "mcpServer" &&
                    mention.serverId === server.id,
                )}
                onCheckedChange={(checked) =>
                  toggleMention(
                    {
                      type: "mcpServer",
                      name: server.name,
                      serverId: server.id,
                      toolCount: server.toolInfo?.length,
                    },
                    checked,
                  )
                }
                label={server.name}
                description={
                  server.toolInfo?.length
                    ? `${server.toolInfo.length} tools`
                    : undefined
                }
              />
            ))}
          />
        </div>
      </OverrideSection>

      {mentions.length > 0 && toolkits.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <InfoIcon className="size-3.5 mt-0.5 shrink-0" />
          {t("mentionsTakePriority")}
        </p>
      )}

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="preset-message">{t("fieldMessage")}</Label>
        <Textarea
          id="preset-message"
          value={message?.text ?? ""}
          placeholder={t("fieldMessagePlaceholder")}
          className="min-h-24 resize-none"
          data-testid="url-rewrite-message"
          onChange={(event) => {
            const text = event.target.value;
            onChange({
              ...preset,
              message: text
                ? { text, mode: message?.mode ?? "prefill" }
                : undefined,
            });
          }}
        />
        <p className="text-xs text-muted-foreground">
          {t("fieldMessageDescription")}
        </p>
      </div>

      <div className={cn("space-y-2", !message && "opacity-50")}>
        <Label>{t("fieldMessageMode")}</Label>
        <RadioGroup
          value={message?.mode ?? "prefill"}
          disabled={!message}
          onValueChange={(mode) =>
            message &&
            onChange({
              ...preset,
              message: {
                ...message,
                mode: mode as (typeof CHAT_LINK_MESSAGE_MODES)[number],
              },
            })
          }
          className="gap-3"
        >
          {CHAT_LINK_MESSAGE_MODES.map((mode) => (
            <label
              key={mode}
              className="flex items-start gap-2 cursor-pointer"
              data-testid={`url-rewrite-mode-${mode}`}
            >
              <RadioGroupItem value={mode} className="mt-0.5" />
              <span>
                <span className="text-sm block">
                  {mode === "send" ? t("modeSend") : t("modePrefill")}
                </span>
                <span className="text-xs text-muted-foreground block">
                  {mode === "send"
                    ? t("modeSendDescription")
                    : t("modePrefillDescription")}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

function SelectGroupItems({
  provider,
}: {
  provider: { provider: string; models: { name: string }[] };
}) {
  return (
    <>
      {provider.models.map((model) => (
        <SelectItem
          key={`${provider.provider}:${model.name}`}
          value={`${provider.provider}:${model.name}`}
        >
          <span className="text-muted-foreground mr-1">
            {provider.provider}
          </span>
          {model.name}
        </SelectItem>
      ))}
    </>
  );
}
