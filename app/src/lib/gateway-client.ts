/**
 * Gateway Client — talks directly to user's local OpenClaw gateway from the browser.
 * Used for CONNECTOR mode agents where the ClawHQ backend can't reach localhost.
 * 
 * Uses OpenAI-compatible /v1/chat/completions endpoint.
 * Browsers special-case localhost for mixed content, so HTTPS→HTTP is allowed.
 */

export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GatewayChatResponse {
  content: string
  model?: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

const DEFAULT_GATEWAY_URL = 'http://localhost:18789'
const CHAT_TIMEOUT_MS = 120_000

export class GatewayClient {
  private url: string
  private token?: string

  constructor(gatewayUrl?: string, token?: string) {
    this.url = (gatewayUrl || DEFAULT_GATEWAY_URL).replace(/\/$/, '')
    this.token = token
  }

  /** Check if the gateway is reachable */
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${this.url}/api/health`, {
        signal: controller.signal,
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      })
      clearTimeout(timeout)
      return res.ok
    } catch {
      return false
    }
  }

  /** Send a chat message via the OpenAI-compatible completions API */
  async sendChat(messages: GatewayMessage[], model = 'openclaw:main'): Promise<GatewayChatResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`

      const res = await fetch(`${this.url}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (res.status === 404) {
        throw new GatewayError(
          'chat-api-disabled',
          'Chat Completions API not enabled. Add this to your OpenClaw config:\n\ngateway:\n  http:\n    endpoints:\n      chatCompletions:\n        enabled: true'
        )
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new GatewayError('api-error', body.error?.message || `Gateway returned ${res.status}`)
      }

      const data = await res.json()
      const choice = data.choices?.[0]
      
      return {
        content: choice?.message?.content || 'No response from agent.',
        model: data.model,
        usage: data.usage,
      }
    } catch (err: any) {
      clearTimeout(timeout)
      if (err instanceof GatewayError) throw err
      if (err.name === 'AbortError') {
        throw new GatewayError('timeout', 'Request to local gateway timed out after 2 minutes')
      }
      throw new GatewayError('unreachable', `Can't reach OpenClaw at ${this.url}. Is it running?`)
    }
  }

  /** Send a simple wake/webhook message (fire-and-forget fallback) */
  async wake(text: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`

      const res = await fetch(`${this.url}/hooks/wake`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  get gatewayUrl() {
    return this.url
  }
}

export class GatewayError extends Error {
  code: 'unreachable' | 'chat-api-disabled' | 'api-error' | 'timeout'

  constructor(code: GatewayError['code'], message: string) {
    super(message)
    this.code = code
    this.name = 'GatewayError'
  }
}
