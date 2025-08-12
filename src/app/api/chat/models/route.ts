import { modelRegistry } from "lib/ai/core/models";

export const GET = async () => {
  return Response.json(modelRegistry.modelsInfo);
};
