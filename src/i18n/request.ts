import { getRequestConfig } from "next-intl/server";
import { safe } from "ts-safe";
import { getLocaleAction } from "./get-locale";
import deepmerge from "deepmerge";

let defaultMessages: any = undefined;

export default getRequestConfig(async () => {
  const locale = await getLocaleAction();

  if (!defaultMessages) {
    defaultMessages = (await import(`../../messages/en.json`)).default;
  }

  const messages = await safe(() => import(`../../messages/${locale}.json`))
    .map((m) => m.default)
    .orElse(defaultMessages);

  return {
    locale,
    messages:
      locale === "en" ? defaultMessages : deepmerge(defaultMessages, messages),
    formats: {
      dateTime: {
        // "Nov 20, 2020"
        short: {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
        // "November 20, 2020"
        long: {
          day: "numeric",
          month: "long",
          year: "numeric",
        },
        // "Nov 20, 2020, 10:36 AM"
        shortWithTime: {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
        },
      },
    },
    getMessageFallback({ key, namespace }) {
      return `${namespace}.${key}`;
    },
  };
});
