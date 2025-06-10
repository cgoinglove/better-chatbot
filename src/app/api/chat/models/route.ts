import { customModelProvider } from "lib/ai/models";

export const GET = async () => {
  return Response.json(customModelProvider.modelsInfo);
};
