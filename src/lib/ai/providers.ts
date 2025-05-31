import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { fireworks } from '@ai-sdk/fireworks';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

interface ModelInfo {
  provider: string;
  models: Array<{
    name: string;
    isToolCallUnsupported: boolean;
  }>;
}

interface ExtendedProvider extends ReturnType<typeof customProvider> {
  modelsInfo: ModelInfo[];
}

const testProvider = customProvider({
  languageModels: {
    'chat-model-small': chatModel,
    'chat-model-large': chatModel,
    'chat-model-reasoning': reasoningModel,
    'title-model': titleModel,
    'artifact-model': artifactModel,
  },
});

const prodProvider = customProvider({
  languageModels: {
    'chat-model-small': openai('gpt-4o-mini'),
    'chat-model-large': openai('gpt-4o'),
    'chat-model-reasoning': wrapLanguageModel({
      model: fireworks('accounts/fireworks/models/deepseek-r1'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': openai('gpt-4-turbo'),
    'artifact-model': openai('gpt-4o-mini'),
  },
  imageModels: {
    'small-model': openai.image('dall-e-2'),
    'large-model': openai.image('dall-e-3'),
  },
});

const modelsInfo = [{
  provider: 'openai',
  models: [
    { name: 'chat-model-small', isToolCallUnsupported: false },
    { name: 'chat-model-large', isToolCallUnsupported: false },
    { name: 'chat-model-reasoning', isToolCallUnsupported: false },
    { name: 'title-model', isToolCallUnsupported: false },
    { name: 'artifact-model', isToolCallUnsupported: false }
  ]
}];

export const myProvider: ExtendedProvider = {
  ...(isTestEnvironment ? testProvider : prodProvider),
  modelsInfo
};
