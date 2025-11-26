import { AIProvider } from './ai-provider.js';

/**
 * ============================================
 * PROVIDER FACTORY
 * ============================================
 * Factory to create providers from templates
 */

export const ProviderFactory = {
    createCustom: (config) => new AIProvider(config),

    createFromTemplate: (type, apiKey) => {
        const templates = {
            openai: {
                name: 'OpenAI',
                type: 'openai',
                apiUrl: 'https://api.openai.com/v1/chat/completions',
                defaultModel: 'gpt-4o',
                models: [
                    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
                    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Affordable and fast' },
                    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous flagship' },
                    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and economical' }
                ]
            },
            openrouter: {
                name: 'OpenRouter',
                type: 'openrouter',
                apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
                defaultModel: 'meta-llama/llama-3.3-70b-instruct',
                models: [
                    // Free Models
                    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', description: 'Free - Meta flagship' },
                    { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2 3B Instruct', description: 'Free - Compact' },
                    { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', description: 'Free - Fast' },
                    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', description: 'Free - Powerful' },
                    { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct', description: 'Free - Largest' },
                    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', description: 'Free - Google latest' },
                    { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', description: 'Free - Fast' },
                    { id: 'google/gemini-flash-1.5-8b', name: 'Gemini Flash 1.5 8B', description: 'Free - Compact' },
                    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: 'Free - Balanced' },
                    { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B Instruct', description: 'Free - Efficient' },
                    { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', description: 'Free - MoE' },
                    { id: 'mistralai/mixtral-8x22b-instruct', name: 'Mixtral 8x22B', description: 'Free - Large MoE' },
                    { id: 'microsoft/phi-3-mini-128k-instruct', name: 'Phi-3 Mini 128K', description: 'Free - Small' },
                    { id: 'microsoft/phi-3-medium-128k-instruct', name: 'Phi-3 Medium 128K', description: 'Free - Medium' },
                    { id: 'qwen/qwen-2-7b-instruct', name: 'Qwen 2 7B', description: 'Free - Alibaba' },
                    { id: 'qwen/qwen-2.5-7b-instruct', name: 'Qwen 2.5 7B', description: 'Free - Latest Qwen' },
                    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', description: 'Free - Chinese AI' },
                    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B', description: 'Free - NVIDIA' },
                    { id: 'liquid/lfm-40b', name: 'LFM 40B', description: 'Free - Liquid AI' },
                    // Popular Paid Models
                    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Paid - OpenAI flagship' },
                    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Paid - Fast GPT' },
                    { id: 'openai/o1-mini', name: 'o1 Mini', description: 'Paid - Reasoning' },
                    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Paid - Anthropic best' },
                    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', description: 'Paid - Fast Claude' },
                    { id: 'google/gemini-pro-1.5-exp', name: 'Gemini Pro 1.5 Exp', description: 'Paid - Google exp' },
                    { id: 'x-ai/grok-2-1212', name: 'Grok 2', description: 'Paid - xAI' },
                    { id: 'perplexity/llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge Online', description: 'Paid - Search' }
                ]
            },
            groq: {
                name: 'Groq',
                type: 'groq',
                apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
                defaultModel: 'llama-3.3-70b-versatile',
                models: [
                    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Latest and best' },
                    { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', description: 'Fast inference' },
                    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Instant responses' },
                    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Large context' },
                    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google model' }
                ]
            },
            deepseek: {
                name: 'DeepSeek',
                type: 'deepseek',
                apiUrl: 'https://api.deepseek.com/v1/chat/completions',
                defaultModel: 'deepseek-chat',
                models: [
                    { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'General chat model' },
                    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: 'Reasoning model' }
                ]
            },
            anthropic: {
                name: 'Anthropic',
                type: 'anthropic',
                apiUrl: 'https://api.anthropic.com/v1/messages',
                defaultModel: 'claude-3-5-sonnet-20241022',
                models: [
                    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Best model' },
                    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and economical' },
                    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable' }
                ]
            }
        };

        const t = templates[type];
        if (!t) {
            return new AIProvider({
                type: 'custom',
                models: [],
                apiKey: apiKey
            });
        }

        return new AIProvider({
            ...t,
            apiKey: apiKey || ''
        });
    },

    getTemplate: (type) => {
        const p = ProviderFactory.createFromTemplate(type, '');
        return p;
    }
};
