import {
  CheckIcon,
  CopyCheckIcon,
  HashIcon,
  TypeIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Input } from "ui/input";
import { Checkbox } from "ui/checkbox";
import { Label } from "ui/label";
import { JSONSchema7 } from "json-schema";
import { Switch } from "ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "ui/select";
import { cleanVariableName } from "lib/utils";

type FieldType = "string" | "number" | "boolean";
export type Feild = {
  key: string;
  type: FieldType;
  enum?: string[];
  description?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
};

type Props = {
  field?: Feild;
  defaultOpen?: boolean;
  onChange?: (field: Feild) => void;
  children: React.ReactNode;
  editAbleKey?: boolean;
};

const _defaultField: Feild = {
  key: "",
  type: "string",
};

export function EditJsonSchemaFieldPopup({
  defaultOpen = false,
  field: defaultField,
  onChange,
  children,
  editAbleKey = true,
}: Props) {
  const t = useTranslations("");
  const [open, setOpen] = useState<boolean>(defaultOpen ?? false);
  const [field, setField] = useState<Feild>(defaultField ?? _defaultField);

  const handleSave = useCallback(() => {
    if (!field.key || !field.type)
      return toast.warning(t("JSONSchema.pleaseEnterKeyAndType"));
    if (field.enum) {
      if (!field.enum?.length)
        return toast.warning(t("JSONSchema.pleaseEnterAtLeastOneOption"));
      if (field.enum.some((item) => !item))
        return toast.warning(t("JSONSchema.pleaseEnterValidOption"));
    }
    onChange?.(field);
    setOpen(false);
  }, [field, onChange, t]);

  useEffect(() => {
    setField(defaultField ?? _defaultField);
  }, [defaultField]);

  useEffect(() => {
    setField(defaultField ?? _defaultField);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent hideClose className="flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("Workflow.fieldEditor")}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto">
          <EditJsonSchemaFieldContent
            editAbleKey={editAbleKey}
            field={field}
            onChange={setField}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("Common.cancel")}</Button>
          </DialogClose>
          <Button onClick={handleSave}>{t("Common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const getFieldKey = (schema: JSONSchema7) => {
  if (schema.type == "string" && schema.enum) return "enum";
  return schema.type!;
};

export function EditJsonSchemaFieldContent({
  field,
  onChange,
  editAbleKey = true,
}: {
  field: Feild;
  onChange: Dispatch<SetStateAction<Feild>>;
  editAbleKey?: boolean;
}) {
  const t = useTranslations("");
  const fieldTypes = useMemo(
    () => [
      {
        type: "string" as FieldType,
        label: t("JSONSchema.string"),
        key: "string",
        icon: TypeIcon,
      },
      {
        type: "number" as FieldType,
        label: t("JSONSchema.number"),
        key: "number",
        icon: HashIcon,
      },
      {
        type: "boolean" as FieldType,
        label: t("JSONSchema.boolean"),
        key: "boolean",
        icon: CheckIcon,
      },
      {
        type: "string" as FieldType,
        label: t("JSONSchema.enum"),
        key: "enum",
        icon: CopyCheckIcon as any,
      },
    ],
    [t],
  );

  const handleAddEnumValue = useCallback(() => {
    onChange((prev) => ({
      ...prev,
      enum: [...(prev.enum ?? []), ""],
    }));
  }, [onChange]);

  const handleRemoveEnumValue = useCallback(
    (index: number) => {
      onChange((prev) => ({
        ...prev,
        enum: (prev.enum ?? []).filter((_, i) => i !== index),
      }));
    },
    [onChange],
  );

  const handleUpdateEnumValue = useCallback(
    (index: number, value: string) => {
      onChange((prev) => ({
        ...prev,
        enum: (prev.enum ?? []).map((item, i) => (i === index ? value : item)),
      }));
    },
    [onChange],
  );

  const currentFieldKey = useMemo(() => {
    if (field.type == "string" && field.enum) return "enum";
    return field.type;
  }, [field.type, field.enum]);

  return (
    <div className="flex flex-col gap-6">
      {/* Field Type */}
      <div className="flex flex-col gap-2">
        <Label>{t("JSONSchema.fieldType")}</Label>
        <div className="grid grid-cols-2 gap-3 my-2">
          {fieldTypes.map((fieldType) => {
            return (
              <div
                key={fieldType.key}
                className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
                  currentFieldKey === fieldType.key
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    type: fieldType.type,
                    enum:
                      fieldType.type == "string" && fieldType.key == "enum"
                        ? []
                        : undefined,
                  }))
                }
              >
                <fieldType.icon className="size-6" />
                <span className="font-medium">{fieldType.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="field-key">{t("Workflow.variableName")}</Label>
        <Input
          id="field-key"
          disabled={!editAbleKey}
          value={field.key ?? ""}
          className="bg-secondary border-none"
          maxLength={30}
          onChange={(e) =>
            onChange((prev) => ({
              ...prev,
              key: cleanVariableName(e.target.value),
            }))
          }
          placeholder={t("Workflow.variableNamePlaceholder")}
        />
      </div>

      {/* Enum Values (only show if type is enum) */}
      {field.enum && (
        <div className="flex flex-col gap-2">
          <Label>{t("Common.options")}</Label>
          <div className="flex flex-col gap-2">
            {(field.enum ?? []).map((value, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-1 bg-secondary/50 rounded-md border group"
              >
                <Input
                  value={value}
                  onChange={(e) => handleUpdateEnumValue(index, e.target.value)}
                  className="border-none bg-transparent shadow-none flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveEnumValue(index)}
                  className="hover:bg-destructive/10! text-muted-foreground hover:text-destructive"
                >
                  <TrashIcon />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={handleAddEnumValue}
              className="border border-dashed rounded-md"
            >
              <PlusIcon className="size-4" />
              <span>{t("Common.addOption")}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Field Description */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="field-description">{t("Common.description")}</Label>
          <span className="text-xs text-muted-foreground">
            {t("Common.optional")}
          </span>
        </div>
        <Input
          id="field-description"
          className="bg-secondary border-none"
          value={field.description ?? ""}
          onChange={(e) =>
            onChange((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder={t("Workflow.fieldDescriptionPlaceholder")}
        />
      </div>

      {/* Default Value */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor="field-default">{t("Common.defaultValue")}</Label>
          <span className="text-xs text-muted-foreground">
            {t("Common.optional")}
          </span>
        </div>
        {field.type === "boolean" ? (
          <div className="flex items-center space-x-2">
            <Switch
              id="field-default-boolean"
              checked={field.defaultValue === true}
              onCheckedChange={(checked) =>
                onChange((prev) => ({
                  ...prev,
                  defaultValue: checked === true ? true : false,
                }))
              }
            />
            <Label htmlFor="field-default-boolean">
              {t("JSONSchema.defaultToTrue")}
            </Label>
          </div>
        ) : field.enum ? (
          <Select
            defaultValue={field.defaultValue?.toString()}
            onValueChange={(value) =>
              onChange((prev) => ({ ...prev, defaultValue: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={t("Workflow.selectOptionPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {!field.enum?.filter((item) => item).length ? (
                <div className="text-muted-foreground text-xs p-2">
                  {t("Common.empty")}
                </div>
              ) : (
                field.enum
                  .filter((item) => item)
                  .map((option, index) => (
                    <SelectItem key={index} value={option} textValue={option}>
                      {option}
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="field-default"
            type={field.type === "number" ? "number" : "text"}
            className="bg-secondary border-none"
            value={field.defaultValue?.toString() ?? ""}
            onChange={(e) => {
              const value =
                field.type === "number"
                  ? e.target.value
                    ? Number(e.target.value)
                    : undefined
                  : e.target.value || undefined;
              onChange((prev) => ({ ...prev, defaultValue: value }));
            }}
            placeholder={t("Workflow.defaultValuePlaceholder", {
              type: field.type,
            })}
          />
        )}
      </div>

      {/* Required Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="field-required"
          checked={field.required ?? false}
          onCheckedChange={(checked) =>
            onChange((prev) => ({
              ...prev,
              required: checked === true,
            }))
          }
        />
        <Label
          htmlFor="field-required"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t("Common.required")}
        </Label>
      </div>
    </div>
  );
}
