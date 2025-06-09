/**
 * Base Portal Implementation
 * 
 * This class provides a foundation for all AI provider portals.
 * It implements common functionality and defines the structure that
 * specific provider implementations should follow.
 */

import { Portal, PortalConfig, TextGenerationOptions, TextGenerationResult, 
  ChatMessage, ChatGenerationOptions, ChatGenerationResult, EmbeddingOptions, EmbeddingResult,
  ImageGenerationOptions, ImageGenerationResult, PortalCapability, PortalType, PortalStatus, ModelType } from '../types/portal.js'
import { Agent } from '../types/agent.js'

export abstract class BasePortal implements Portal {
  id: string
  name: string
  version: string
  abstract type: PortalType
  enabled: boolean = true
  status: PortalStatus = PortalStatus.INACTIVE
  config: PortalConfig
  abstract supportedModels: ModelType[]

  constructor(id: string, name: string, version: string, config: PortalConfig) {
    this.id = id
    this.name = name
    this.version = version
    this.config = {
      maxTokens: 1000,
      temperature: 0.7,
      timeout: 30000,
      ...config
    }
  }

  /**
   * Initialize the portal with an agent
   * @param agent The agent to initialize with
   */
  async init(agent: Agent): Promise<void> {
    console.log(`🔮 Initializing ${this.name} portal for agent ${agent.name}`)
    
    try {
      await this.validateConfig()
      console.log(`✅ ${this.name} portal initialized for ${agent.name}`)
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.name} portal:`, error)
      throw error
    }
  }

  /**
   * Validate the portal configuration
   */
  protected async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error(`API key is required for ${this.name} portal`)
    }
  }

  /**
   * Generate text from a prompt
   * @param prompt The prompt to generate text from
   * @param options Options for text generation
   */
  abstract generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult>

  /**
   * Generate a chat response from messages
   * @param messages The chat messages to generate a response from
   * @param options Options for chat generation
   */
  abstract generateChat(messages: ChatMessage[], options?: ChatGenerationOptions): Promise<ChatGenerationResult>

  /**
   * Generate an embedding for text
   * @param text The text to generate an embedding for
   * @param options Options for embedding generation
   */
  abstract generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult>
  
  /**
   * Generate an image from a prompt
   * @param prompt The prompt to generate an image from
   * @param options Options for image generation
   */
  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult> {
    throw new Error(`Image generation not supported by ${this.name} portal`)
  }
  
  /**
   * Stream text generation for real-time responses
   * @param prompt The prompt to generate text from
   * @param options Options for text generation
   */
  async *streamText(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string> {
    throw new Error(`Text streaming not supported by ${this.name} portal`)
  }
  
  /**
   * Stream chat generation for real-time responses
   * @param messages The chat messages to generate a response from
   * @param options Options for chat generation
   */
  async *streamChat(messages: ChatMessage[], options?: ChatGenerationOptions): AsyncGenerator<string> {
    throw new Error(`Chat streaming not supported by ${this.name} portal`)
  }
  
  /**
   * Check if the portal supports a specific capability
   * @param capability The capability to check for
   */
  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
        return true
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
      case PortalCapability.AUDIO:
        return false
      default:
        return false
    }
  }
}