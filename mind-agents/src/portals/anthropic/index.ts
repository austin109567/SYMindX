/**
 * Anthropic Portal Implementation
 * 
 * This portal provides integration with Anthropic's Claude API using the Vercel AI SDK.
 * Supports Claude's advanced reasoning and safety features.
 */

import { anthropic, createAnthropic } from '@ai-sdk/anthropic'
import { generateText, streamText } from 'ai'
import { BasePortal } from '../base-portal.js'
import { PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult,
  ImageGenerationOptions, ImageGenerationResult, PortalCapability, MessageRole, FinishReason, PortalType, ModelType } from '../../types/portal.js'

export interface AnthropicConfig extends PortalConfig {
  model?: string
  baseURL?: string
}

export class AnthropicPortal extends BasePortal {
  type: PortalType = PortalType.ANTHROPIC;
  supportedModels: ModelType[] = [ModelType.TEXT_GENERATION, ModelType.CHAT, ModelType.MULTIMODAL];
  private provider: any
  
  constructor(config: AnthropicConfig) {
    super('anthropic', 'Anthropic', '1.0.0', config)
    
    // Create a custom Anthropic provider instance if we have custom settings
    if (config.baseURL) {
      this.provider = createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL
      })
    } else {
      // Use the default provider with API key from environment or config
      this.provider = anthropic
      // Set API key in environment if provided in config
      if (config.apiKey && !process.env.ANTHROPIC_API_KEY) {
        process.env.ANTHROPIC_API_KEY = config.apiKey
      }
    }
  }

  /**
   * Generate text using Anthropic's completion API
   */
  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      const model = (this.config as AnthropicConfig).model || 'claude-4-sonnet'
      
      const result = await generateText({
        model: this.provider(model),
        prompt,
        maxTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP
      })

      return {
        text: result.text,
        usage: {
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0
        },
        finishReason: (result.finishReason as FinishReason) || FinishReason.STOP,
        metadata: {
          model,
          provider: 'anthropic'
        }
      }
    } catch (error) {
      console.error('Anthropic text generation error:', error)
      throw new Error(`Anthropic text generation failed: ${error}`)
    }
  }

  /**
   * Generate chat response using Anthropic's messages API
   */
  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    try {
      const model = (this.config as AnthropicConfig).model || 'claude-4-sonnet'
      
      const result = await generateText({
        model: this.provider(model),
        messages: messages.map(msg => ({
          role: msg.role === 'function' ? 'assistant' : msg.role,
          content: msg.content
        })) as any,
        maxTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        tools: options?.functions ? Object.fromEntries(
          options.functions.map(fn => [
            fn.name,
            {
              description: fn.description,
              parameters: fn.parameters
            }
          ])
        ) : undefined
      })

      return {
        message: {
          role: MessageRole.ASSISTANT,
          content: result.text
        },
        text: result.text,
        usage: {
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0
        },
        finishReason: (result.finishReason as FinishReason) || FinishReason.STOP,
        metadata: {
          model,
          provider: 'anthropic'
        }
      }
    } catch (error) {
      console.error('Anthropic chat generation error:', error)
      throw new Error(`Anthropic chat generation failed: ${error}`)
    }
  }

  /**
   * Generate embeddings - Note: Anthropic doesn't provide embedding models
   * This is a placeholder that throws an error
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    throw new Error('Anthropic does not provide embedding models. Consider using OpenAI or another provider for embeddings.')
  }
  
  /**
   * Generate images - Note: Anthropic doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    throw new Error('Anthropic does not provide image generation models. Consider using OpenAI or another provider for image generation.')
  }

  /**
   * Stream text generation for real-time responses
   */
  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    try {
      const model = (this.config as AnthropicConfig).model || 'claude-4-sonnet'
      
      const result = await streamText({
        model: this.provider(model),
        prompt,
        maxTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature
      })

      for await (const delta of result.textStream) {
        yield delta
      }
    } catch (error) {
      console.error('Anthropic stream text error:', error)
      throw new Error(`Anthropic stream text failed: ${error}`)
    }
  }
  
  /**
   * Stream chat generation for real-time responses
   */
  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    try {
      const model = (this.config as AnthropicConfig).model || 'claude-4-sonnet'
      
      const result = await streamText({
        model: this.provider(model),
        messages: messages.map(msg => ({
          role: msg.role === 'function' ? 'assistant' : msg.role,
          content: msg.content
        })) as any,
        maxTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        tools: options?.functions ? Object.fromEntries(
          options.functions.map(fn => [
            fn.name,
            {
              description: fn.description,
              parameters: fn.parameters
            }
          ])
        ) : undefined
      })

      for await (const delta of result.textStream) {
        yield delta
      }
    } catch (error) {
      console.error('Anthropic stream chat error:', error)
      throw new Error(`Anthropic stream chat failed: ${error}`)
    }
  }
  
  /**
   * Check if the portal supports a specific capability
   */
  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
        return true;
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }
}

// Export factory function for easy instantiation
export function createAnthropicPortal(config: AnthropicConfig): AnthropicPortal {
  return new AnthropicPortal(config)
}

// Export default configuration
export const defaultAnthropicConfig: Partial<AnthropicConfig> = {
  model: 'claude-4-sonnet',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000
}

// Available Anthropic models (Updated with Claude 4)
export const anthropicModels = {
  // Claude 4 Series (Latest - Best coding and reasoning models)
  'claude-4-opus': 'Claude 4 Opus - World\'s best coding model with sustained performance',
  'claude-4-sonnet': 'Claude 4 Sonnet - Significant upgrade with superior coding and reasoning',
  
  // Claude 3.7 Series
  'claude-3.7-sonnet': 'Claude 3.7 Sonnet - Enhanced capabilities',
  
  // Claude 3.5 Series
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet (Latest)',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku'
}