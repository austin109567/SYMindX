/**
 * Groq Portal Implementation
 * 
 * This portal provides integration with Groq's API using the Vercel AI SDK.
 * Groq specializes in fast inference with open-source models.
 */

import { groq, createGroq } from '@ai-sdk/groq'
import { generateText, streamText } from 'ai'
import { BasePortal } from '../base-portal.js'
import { PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult,
  ImageGenerationOptions, ImageGenerationResult, PortalCapability, PortalType, ModelType, MessageRole } from '../../types/portal.js'

export interface GroqConfig extends PortalConfig {
  model?: string
  baseURL?: string
}

export class GroqPortal extends BasePortal {
  type: PortalType = PortalType.CUSTOM;
  supportedModels: ModelType[] = [ModelType.TEXT_GENERATION, ModelType.CHAT, ModelType.CODE_GENERATION];
  private provider: any
  
  constructor(config: GroqConfig) {
    super('groq', 'Groq', '1.0.0', config)
    
    // Create a custom Groq provider instance if we have custom settings
    if (config.baseURL) {
      this.provider = createGroq({
        apiKey: config.apiKey,
        baseURL: config.baseURL
      })
    } else {
      // Use the default provider with API key from environment or config
      this.provider = groq
      // Set API key in environment if provided in config
      if (config.apiKey && !process.env.GROQ_API_KEY) {
        process.env.GROQ_API_KEY = config.apiKey
      }
    }
  }

  /**
   * Generate text using Groq's completion API
   */
  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    try {
      const model = (this.config as GroqConfig).model || 'llama-3.1-70b-versatile'
      
      const result = await generateText({
        model: this.provider(model),
        prompt,
        maxTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty
      })

      return {
        text: result.text,
        usage: {
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0
        },
        metadata: {
          model,
          provider: 'groq'
        }
      }
    } catch (error) {
      console.error('Groq text generation error:', error)
      throw new Error(`Groq text generation failed: ${error}`)
    }
  }

  /**
   * Generate chat response using Groq's chat completion API
   */
  async generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult> {
    try {
      const model = (this.config as GroqConfig).model || 'llama-3.1-70b-versatile'
      
      const result = await generateText({
        model: this.provider(model),
        messages: messages.map(msg => ({
          role: msg.role === 'function' ? 'assistant' : msg.role,
          content: msg.content
        })) as any,
        maxTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty,
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
        metadata: {
          model,
          provider: 'groq'
        }
      }
    } catch (error) {
      console.error('Groq chat generation error:', error)
      throw new Error(`Groq chat generation failed: ${error}`)
    }
  }

  /**
   * Generate embeddings - Note: Groq doesn't provide embedding models
   * This is a placeholder that throws an error
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    throw new Error('Groq does not provide embedding models. Consider using OpenAI or another provider for embeddings.')
  }
  
  /**
   * Generate images - Note: Groq doesn't provide image generation models
   * This is a placeholder that throws an error
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    throw new Error('Groq does not provide image generation models. Consider using OpenAI or another provider for image generation.')
  }

  /**
   * Stream text generation for real-time responses
   */
  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    try {
      const model = (this.config as GroqConfig).model || 'llama-3.1-70b-versatile'
      
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
      console.error('Groq stream text error:', error)
      throw new Error(`Groq stream text failed: ${error}`)
    }
  }
  
  /**
   * Stream chat generation for real-time responses
   */
  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    try {
      const model = (this.config as GroqConfig).model || 'llama-3.1-70b-versatile'
      
      const result = await streamText({
        model: this.provider(model),
        messages: messages.map(msg => ({
          role: msg.role === 'function' ? 'assistant' : msg.role,
          content: msg.content
        })) as any,
        maxTokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        topP: options?.topP,
        frequencyPenalty: options?.frequencyPenalty,
        presencePenalty: options?.presencePenalty
      })

      for await (const delta of result.textStream) {
        yield delta
      }
    } catch (error) {
      console.error('Groq stream chat error:', error)
      throw new Error(`Groq stream chat failed: ${error}`)
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
        return true;
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.VISION:
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }
}

// Export factory function for easy instantiation
export function createGroqPortal(config: GroqConfig): GroqPortal {
  return new GroqPortal(config)
}

// Export default configuration
export const defaultGroqConfig: Partial<GroqConfig> = {
  model: 'llama-3.3-70b-versatile',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000
}

// Available Groq models (Updated February 2025)
export const groqModels = {
  // Llama 3.3 Series (Latest)
  'llama-3.3-70b-versatile': 'Llama 3.3 70B Versatile - Latest flagship model',
  
  // Llama 3.1 Series
  'llama-3.1-70b-versatile': 'Llama 3.1 70B Versatile',
  'llama-3.1-8b-instant': 'Llama 3.1 8B Instant',
  
  // Llama Tool Use Models
  'llama-3-groq-70b-8192-tool-use-preview': 'Llama 3 Groq 70B Tool Use',
  'llama-3-groq-8b-8192-tool-use-preview': 'Llama 3 Groq 8B Tool Use',
  
  // Gemma Series
  'gemma2-9b-it': 'Gemma 2 9B IT',
  'gemma-7b-it': 'Gemma 7B IT',
  
  // Legacy Models (Still Available)
  'llama3-70b-8192': 'Llama 3 70B',
  'llama3-8b-8192': 'Llama 3 8B'
  
  // Note: Mixtral models have been deprecated as of 2024
}