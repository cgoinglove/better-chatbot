"use client";

import { Button } from "ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface BackButtonProps {
  returnUrl: string;
}

export function BackButton({ returnUrl }: BackButtonProps) {
  const t = useTranslations("Admin.Users");

  return (
    <Link href={returnUrl}>
      <Button variant="ghost" size="sm" className="hover:bg-muted">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("backToUsers")}
      </Button>
    </Link>
  );
}
