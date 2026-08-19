"use client";

import { ImagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "ui/dropdown-menu";
import { GeminiIcon } from "ui/gemini-icon";

export function ImageGeneratorSelector({
  onGenerateImage,
  modelInfo,
}: {
  onGenerateImage?: (provider?: "google") => void;
  modelInfo?: { isToolCallUnsupported?: boolean };
}) {
  const t = useTranslations("Chat");

  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-xs flex items-center gap-2 font-semibold cursor-pointer">
          <ImagesIcon className="size-3.5" />
          {t("generateImage")}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              disabled={modelInfo?.isToolCallUnsupported}
              onClick={() => onGenerateImage?.("google")}
              className="cursor-pointer"
            >
              <GeminiIcon className="mr-2 size-4" />
              Gemini 2.5 Flash Image
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}
