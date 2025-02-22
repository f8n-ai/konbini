import { ClientRegistry } from '@boundaryml/baml'
import { $ } from 'bun'
import { z } from 'zod'
/**
 * Discover all potentially available LLM clients based on environment variables.
 * 
 * The preference order is:
 * - Anthropic Sonnet 3.5
 * - OpenAI GPT-4o
 * - Google Gemini Pro
 * - LMStudio Local Model
 * - Ollama Local Model
 */

const ModelClientSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('lms'),
        architecture: z.string(),
        path: z.string(),
    }),
    z.object({
        type: z.literal('ollama'),
        name: z.string(),
        id: z.string(),
    }),
    z.object({
        type: z.literal('openai'),
        apiKey: z.literal('OPENAI_API_KEY'),
        model: z.literal('gpt-4o'),
    }),
    z.object({
        type: z.literal('anthropic'),
        apiKey: z.literal('ANTHROPIC_API_KEY'),
        model: z.literal('claude-3-5-sonnet-20241022'),
    }),
    z.object({
        type: z.literal('gemini'),
        apiKey: z.literal('GEMINI_API_KEY'),
        model: z.literal('gemini-2.0-flash-thinking-exp-1219'),
    }),
])

type ModelClient = z.infer<typeof ModelClientSchema>

const API_ENV_VAR_TO_CLIENT_NAME = {
    ANTHROPIC_API_KEY: 'AnthropicSonnet',
    OPENAI_API_KEY: 'OpenAIGPT4o',
    GEMINI_API_KEY: 'GoogleGeminiPro',
} as const

async function enumerateClients(): Promise<string[]> {
    const clients: string[] = []
    for (const [envVar, clientName] of Object.entries(API_ENV_VAR_TO_CLIENT_NAME)) {
        if (process.env[envVar]) {
            clients.push(clientName)
        }
    }

    /**
     * Use shell commands to discover local models for LMStudio and Ollama
     */
    const lmsCmdResult = await $`lms list --json --llm`
    if (lmsCmdResult.exitCode === 0) {
        const lmsModels: {
            path: string
            architecture: string
        }[] = await lmsCmdResult.json()

        for (const lmsModel of lmsModels) {
            clients.push(`lms-${lmsModel.architecture}-${lmsModel.path}`)
        }
    }

    const ollamaCmdResult = await $`ollama ls`
    if (ollamaCmdResult.exitCode === 0) {
        const raw = ollamaCmdResult.text().split('\n').slice(1).filter(Boolean);
        for (const line of raw) {
            const [name, id] = line.trim().split(/\s+/);
            clients.push(`ollama-${name}-${id}`)
        }
    }

    return clients
}

async function generateClients() {
    const cr = new ClientRegistry()

    // Creates a new client
    cr.addLlmClient('MyAmazingClient', 'openai', {
        model: "gpt-4o",
        temperature: 0.7,
        api_key: process.env.OPENAI_API_KEY
    })
    // Sets MyAmazingClient as the primary client
    cr.setPrimary('MyAmazingClient')
    // ExtractResume will now use MyAmazingClient as the calling client
    const res = await b.ExtractResume("...", { clientRegistry: cr })
}