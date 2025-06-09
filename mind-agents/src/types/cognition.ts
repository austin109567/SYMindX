/**
 * Cognition module types for SYMindX
 */

import { Agent, ThoughtContext, ThoughtResult } from './agent.js'
import { BaseConfig } from './common'

/**
 * Base interface for all cognition modules
 */
export interface CognitionModule {
  /**
   * Process the current context and generate thoughts, emotions, and actions
   * @param agent The agent that is thinking
   * @param context The context for thinking
   * @returns The result of thinking
   */
  think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult>;
  
  /**
   * Initialize the cognition module with configuration
   * @param config Configuration for the cognition module
   */
  initialize(config: BaseConfig): void;
}

/**
 * Metadata for cognition module registration
 */
export interface CognitionModuleMetadata {
  /**
   * Unique identifier for the cognition module
   */
  id: string;
  
  /**
   * Display name of the cognition module
   */
  name: string;
  
  /**
   * Description of the cognition module
   */
  description: string;
  
  /**
   * Version of the cognition module
   */
  version: string;
  
  /**
   * Author of the cognition module
   */
  author: string;
}

/**
 * Factory function type for creating cognition modules
 */
export type CognitionModuleFactory = (config?: BaseConfig) => CognitionModule;