import { getTranslations } from "next-intl/server";
import { EditItemLoading } from "@/components/ui/edit-item-loading";

export default async function AgentLoading() {
  const t = await getTranslations();

  return (
    <EditItemLoading title={t("Common.editAgent")} showGenerateButton={true} />
  );
}
