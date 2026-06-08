export interface ModelMeta {
  name: string;
  color: string;
  bg: string;
  icon?: string;
}

export const MODEL_META: Record<string, ModelMeta> = {
  grok: { name: 'Grok', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  'x-ai/grok-3': {
    name: 'Grok 3',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
  },
  claude: { name: 'Claude', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  'anthropic/claude-opus-4.7': {
    name: 'Claude Opus 4.7',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
  },
  gpt: { name: 'GPT', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  'openai/gpt-4o': {
    name: 'GPT-4o',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
  },
  'openai/gpt-5': {
    name: 'GPT-5',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
  },
  gemini: { name: 'Gemini', color: '#1D9BF0', bg: 'rgba(29,155,240,0.08)' },
  'google/gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    color: '#1D9BF0',
    bg: 'rgba(29,155,240,0.08)',
  },
  deepseek: { name: 'DeepSeek', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
  llama: { name: 'Llama', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  qwen: { name: 'Qwen', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)' },
  mistral: { name: 'Mistral', color: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
};

export function getModelMeta(modelKey: string): ModelMeta {
  // 尝试精确匹配
  if (MODEL_META[modelKey]) return MODEL_META[modelKey];
  // 尝试前缀匹配
  for (const key of Object.keys(MODEL_META)) {
    if (modelKey.toLowerCase().includes(key.toLowerCase())) {
      return MODEL_META[key];
    }
  }
  // 默认
  return { name: modelKey, color: '#6b7280', bg: 'rgba(107,114,128,0.08)' };
}
