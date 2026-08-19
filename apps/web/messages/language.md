# Adding a New Language

To add a new language to the application, follow these simple steps:

1. Copy the `messages/en.json` file and rename it to match your language code (e.g., `fr.json` for French).

2. Translate all content in the file to your target language while maintaining the same JSON structure and keys.

3. Add your language to the `SUPPORTED_LOCALES` array in `src/lib/const.ts` file:

```typescript
export const SUPPORTED_LOCALES = [
  {
    code: "en",
    name: "English 🇺🇸",
  },
  {
    code: "ko",
    name: "Korean 🇰🇷",
  },
  {
    code: "your-language-code",
    name: "Your Language Name 🏴",
  },
];
```

The language will then be available in the language selector of the application.

## Billing popup (`Billing`)

The **Manage billing** dialog (opened from the user menu or the `open-billing` event) uses the top-level `Billing` namespace in each locale file. It includes:

- **Root keys**: `title`, `subtitle`, org billing notices (`orgUsageShared`, `orgOwnerCanManage`, `orgContactAdmin`), `currentPlan` (with `{plan}`), `planFree`, `planPro`, `creditsUsedThisMonth` (with `{used}` and `{included}`), `billingManagedByOrgAdmin`, `manageBilling`.
- **Nested objects**: `free`, `pro`, and `enterprise`, each with plan copy and `feature1Primary` / `feature1Secondary` through `feature6` (enterprise has three features; `enterprise.feature1Secondary` may be an empty string).

When adding a language, copy the `Billing` block from `en.json` and translate every string. The UI reads these via `next-intl` (`useTranslations("Billing")` in `src/components/billing/billing-page.tsx`), so missing keys will fall back to the default locale or show the key name.
