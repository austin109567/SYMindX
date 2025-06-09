/**
 * Memory Types for SYMindX
 * 
 * This file defines the interfaces for memory providers and their metadata.
 */

import { MemoryProvider, MemoryRecord } from './agent.js'

/**
 * Metadata for a memory provider
 */
export interface MemoryProviderMetadata {
  /**
   * Unique identifier for the memory provider
   */
  id: string

  /**
   * Human-readable name for the memory provider
   */
  name: string

  /**
   * Description of the memory provider
   */
  description: string

  /**
   * Version of the memory provider
   */
  version: string

  /**
   * Author of the memory provider
   */
  author: string

  /**
   * Whether the memory provider supports vector search
   */
  supportsVectorSearch: boolean

  /**
   * Whether the memory provider is persistent (survives restarts)
   */
  isPersistent: boolean
}

/**
 * Factory function for creating a memory provider
 */
export type MemoryProviderFactory = (config: any) => MemoryProvider

/**
 * Configuration for a memory provider
 */
export interface MemoryProviderConfig {
  /**
   * The type of memory provider
   */
  provider: string

  /**
   * The maximum number of records to keep
   */
  maxRecords: number

  /**
   * The embedding model to use for vector search
   */
  embeddingModel: string

  /**
   * The number of days to retain memories
   */
  retentionDays: number

  /**
   * Provider-specific configuration
   */
  [key: string]: any
}