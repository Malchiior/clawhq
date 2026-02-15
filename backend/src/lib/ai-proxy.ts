/**
 * AI Proxy Service
 * 
 * Proxies chat requests to AI providers (Anthropic, OpenAI, Google, DeepSeek, Grok)
 * using ClawHQ's bundled API keys. Handles streaming, token counting, and error recovery.
 * Users on the "bundled" plan never need their own API keys.
 */

import { bundledApiService } from './bundled-api'
import prisma from './prisma'

// Provider → model prefix mapping
const PROVIDER_MODELS: Record<string, string[]> = {
  ANTHROPIC: ['claude-'],
  OPENAI: ['gpt-', 'o1-', 'o3-'],
  GOOGLE: ['gemini-'],
  DEEPSEEK: ['deepseek-'],
  GROK: ['grok-'],
}

// Default models per provider
const DEFAULT_MODELS: Record<string, string> = {
  ANTHROPIC: 'claude-sonnet-4-20250514',
  OPENAI: 'gpt-4o',
  GOOGLE: 'gemini-1.5-flash',
  DEEPSEEK: 'deepseek-chat',
  GROK: 'grok-beta',
}

// Anthropic API version
const ANTHROPIC_API_VERSION = '2023-06-01'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
}

interface ContentBlock {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

interface ProxyRequest {
  model: string
  systemPrompt: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  attachments?: Array<{
    name: string
    type: string
    dataUri?: string
    textPreview?: string
  }>
}

interface ProxyResponse {
  content: string
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
  finishReason: string
}

function getProviderForModel(model: string): string | null {
  for (const [provider, prefixes] of Object.entries(PROVIDER_MODELS)) {
    if (prefixes.some(prefix => model.startsWith(prefix))) {
      return provider
    }
  }
  return null
}

function resolveModel(model: string): { provider: string; model: string } {
  // If it's a provider name, use default model
  const upperModel = model.toUpperCase()
  if (DEFAULT_MODELS[upperModel]) {
    return { provider: upperModel, model: DEFAULT_MODELS[upperModel] }
  }

  // Detect provider from model name
  const provider = getProviderForModel(model)
  if (provider) {
    return { provider, model }
  }

  // Fallback to Anthropic Sonnet
  return { provider: 'ANTHROPIC', model: DEFAULT_MODELS.ANTHROPIC }
}

// ── Anthropic ──────────────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<ProxyResponse> {
  // Convert messages to Anthropic format (system prompt is separate)
  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  const body: any = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: anthropicMessages,
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error (${response.status}): ${error}`)
  }

  const data = await response.json() as any
  const textContent = data.content
    ?.filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('\n') || ''

  return {
    content: textContent,
    model: data.model,
    provider: 'ANTHROPIC',
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
    finishReason: data.stop_reason || 'end_turn',
  }
}

// ── OpenAI ─────────────────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<ProxyResponse> {
  const openaiMessages: any[] = []
  
  if (systemPrompt) {
    openaiMessages.push({ role: 'system', content: systemPrompt })
  }

  for (const msg of messages) {
    if (msg.role === 'system') continue
    openaiMessages.push({
      role: msg.role,
      content: msg.content,
    })
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: openaiMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error (${response.status}): ${error}`)
  }

  const data = await response.json() as any
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model,
    provider: 'OPENAI',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    finishReason: data.choices?.[0]?.finish_reason || 'stop',
  }
}

// ── Google (Gemini) ────────────────────────────────────────

async function callGoogle(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<ProxyResponse> {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : '' }],
    }))

  const body: any = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  }

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google AI API error (${response.status}): ${error}`)
  }

  const data = await response.json() as any
  const textContent = data.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text)
    .join('\n') || ''

  return {
    content: textContent,
    model,
    provider: 'GOOGLE',
    inputTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    finishReason: data.candidates?.[0]?.finishReason || 'STOP',
  }
}

// ── DeepSeek ───────────────────────────────────────────────

async function callDeepSeek(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<ProxyResponse> {
  // DeepSeek uses OpenAI-compatible API
  const dsMessages: any[] = []
  if (systemPrompt) {
    dsMessages.push({ role: 'system', content: systemPrompt })
  }
  for (const msg of messages) {
    if (msg.role === 'system') continue
    dsMessages.push({ role: msg.role, content: msg.content })
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: dsMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API error (${response.status}): ${error}`)
  }

  const data = await response.json() as any
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
    provider: 'DEEPSEEK',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    finishReason: data.choices?.[0]?.finish_reason || 'stop',
  }
}

// ── Grok (xAI) ─────────────────────────────────────────────

async function callGrok(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<ProxyResponse> {
  // xAI also uses OpenAI-compatible API
  const grokMessages: any[] = []
  if (systemPrompt) {
    grokMessages.push({ role: 'system', content: systemPrompt })
  }
  for (const msg of messages) {
    if (msg.role === 'system') continue
    grokMessages.push({ role: msg.role, content: msg.content })
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: grokMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Grok API error (${response.status}): ${error}`)
  }

  const data = await response.json() as any
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
    provider: 'GROK',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    finishReason: data.choices?.[0]?.finish_reason || 'stop',
  }
}

// ── Main Proxy Function ────────────────────────────────────

const PROVIDER_CALLERS: Record<string, typeof callAnthropic> = {
  ANTHROPIC: callAnthropic,
  OPENAI: callOpenAI,
  GOOGLE: callGoogle,
  DEEPSEEK: callDeepSeek,
  GROK: callGrok,
}

export async function proxyAiRequest(req: ProxyRequest): Promise<ProxyResponse> {
  const { provider, model } = resolveModel(req.model)
  const maxTokens = req.maxTokens || 4096
  const temperature = req.temperature ?? 0.7

  // Get bundled API key for this provider
  const apiKey = await bundledApiService.getApiKey(provider)
  if (!apiKey) {
    throw new Error(
      `No API key available for provider ${provider}. ` +
      `Please switch to BYOK mode and add your own ${provider} key, or try a different model.`
    )
  }

  // Build message array with image attachments for vision models
  const messages = buildMessagesWithAttachments(req.messages, req.attachments)

  const caller = PROVIDER_CALLERS[provider]
  if (!caller) {
    throw new Error(`Unsupported provider: ${provider}`)
  }

  return await caller(apiKey, req.systemPrompt, messages, model, maxTokens, temperature)
}

/**
 * High-level: check credits, proxy, record usage, deduct credits.
 * Returns the AI response content string.
 */
export async function proxyChatForUser(
  userId: string,
  agentModel: string,
  systemPrompt: string,
  conversationMessages: ChatMessage[],
  attachments?: any[]
): Promise<{ content: string; metadata: Record<string, any> }> {
  // 1. Check user limits
  const limits = await bundledApiService.checkUserLimits(userId)
  if (!limits.canUse) {
    throw new Error(limits.reason || 'Usage limit reached. Please upgrade your plan.')
  }

  // 2. Proxy the request
  const result = await proxyAiRequest({
    model: agentModel,
    systemPrompt,
    messages: conversationMessages,
    attachments,
  })

  // 3. Record usage + deduct credits
  await bundledApiService.recordUsage(userId, result.provider, {
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    model: result.model,
    timestamp: new Date(),
  })

  return {
    content: result.content,
    metadata: {
      model: result.model,
      provider: result.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      finishReason: result.finishReason,
      generatedAt: new Date().toISOString(),
    },
  }
}

// Build messages with image attachments inlined (for vision-capable models)
function buildMessagesWithAttachments(
  messages: ChatMessage[],
  attachments?: any[]
): ChatMessage[] {
  if (!attachments || attachments.length === 0) return messages

  // Clone messages
  const result = messages.map(m => ({ ...m }))

  // Find the last user message and attach images
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].role === 'user') {
      const textContent = typeof result[i].content === 'string'
        ? result[i].content as string
        : ''

      const contentBlocks: ContentBlock[] = []

      // Add text first
      if (textContent) {
        contentBlocks.push({ type: 'text', text: textContent })
      }

      // Add file context
      for (const att of attachments) {
        if (att.type?.startsWith('image/') && att.dataUri) {
          // Extract base64 data from data URI
          const match = att.dataUri.match(/^data:([^;]+);base64,(.+)$/)
          if (match) {
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: match[1],
                data: match[2],
              },
            })
          }
        } else if (att.textPreview) {
          // For text files, include the preview as context
          contentBlocks.push({
            type: 'text',
            text: `[File: ${att.name}]\n${att.textPreview}`,
          })
        }
      }

      result[i].content = contentBlocks.length > 0 ? contentBlocks : textContent
      break
    }
  }

  return result
}

export default { proxyAiRequest, proxyChatForUser }
