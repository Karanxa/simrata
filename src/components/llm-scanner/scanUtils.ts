import { supabase } from "@/integrations/supabase/client";

export const performLLMScan = async (
  prompt: string,
  provider: string,
  model: string | null,
  userId: string,
  customEndpoint?: string,
  curlCommand?: string,
  customHeaders?: string,
  apiKey?: string
) => {
  const { data, error } = await supabase.functions.invoke('ai-operations', {
    body: {
      operation: 'llm-scan',
      prompt,
      provider,
      model,
      userId,
      customEndpoint,
      curlCommand,
      customHeaders,
      apiKey
    }
  });

  if (error) throw error;
  return data;
};

export const handleSingleScan = async (
  prompt: string,
  provider: string,
  apiKey: string,
  customEndpoint: string,
  curlCommand: string,
  promptPlaceholder: string,
  customHeaders: string,
  selectedModel: string,
  userId: string,
  scanType: 'manual' | 'batch',
  batchId: string | null,
  label?: string,
  attackCategory?: string
) => {
  const { data, error } = await supabase.functions.invoke('ai-operations', {
    body: {
      operation: 'llm-scan',
      prompt,
      provider,
      model: selectedModel,
      userId,
      customEndpoint,
      curlCommand,
      promptPlaceholder,
      customHeaders,
      apiKey,
      scanType,
      batchId,
      label,
      attackCategory
    }
  });

  if (error) throw error;
  return data;
};

export const performBatchScan = async (
  prompts: string[],
  provider: string,
  model: string | null,
  userId: string,
  batchName: string,
  customEndpoint?: string,
  curlCommand?: string,
  customHeaders?: string,
  apiKey?: string
) => {
  const { data, error } = await supabase.functions.invoke('ai-operations', {
    body: {
      operation: 'batch-llm-scan',
      prompts,
      provider,
      model,
      userId,
      batchName,
      customEndpoint,
      curlCommand,
      customHeaders,
      apiKey
    }
  });

  if (error) throw error;
  return data;
};