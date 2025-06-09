/**
 * Emotion module types for SYMindX
 */

import { EmotionState, EmotionRecord, EmotionConfig } from './agent.js'
import { Context, BaseConfig } from './common'

/**
 * Base interface for all emotion modules
 */
export interface EmotionModule {
  /**
   * Current emotion string
   */
  current: string;
  
  /**
   * Current emotion intensity (0.0 to 1.0)
   */
  intensity: number;
  
  /**
   * Process an event and update the emotion state
   * @param eventType The type of event that occurred
   * @param context Additional context about the event
   * @returns The updated emotion state
   */
  processEvent(eventType: string, context?: Context): EmotionState;
  
  /**
   * Get the current emotion state
   * @returns The current emotion state
   */
  getCurrentState(): EmotionState;
  
  /**
   * Get the current emotion
   * @returns The current emotion string
   */
  getCurrentEmotion(): string;
  
  /**
   * Update the emotion state directly
   * @param emotion The emotion to set
   * @param intensity The intensity of the emotion (0.0 to 1.0)
   * @param triggers What triggered this emotion
   * @returns The updated emotion state
   */
  setEmotion(emotion: string, intensity: number, triggers?: string[]): EmotionState;
  
  /**
   * Get the emotion history
   * @param limit Maximum number of records to return
   * @returns Array of emotion records
   */
  getHistory(limit?: number): EmotionRecord[];
  
  /**
   * Reset the emotion state to neutral
   * @returns The updated emotion state
   */
  reset(): EmotionState;
}

/**
 * Base class for emotion definitions
 */
export interface EmotionDefinition {
  /**
   * The intensity of the emotion (0.0 to 1.0)
   */
  intensity: number;
  
  /**
   * Events that can trigger this emotion
   */
  triggers: string[];
  
  /**
   * Color representation of the emotion (for UI)
   */
  color: string;
  
  /**
   * Optional description of the emotion
   */
  description?: string;
}

/**
 * Metadata for emotion module registration
 */
export interface EmotionModuleMetadata {
  /**
   * Unique identifier for the emotion module
   */
  id: string;
  
  /**
   * Display name of the emotion module
   */
  name: string;
  
  /**
   * Description of the emotion module
   */
  description: string;
  
  /**
   * Version of the emotion module
   */
  version: string;
  
  /**
   * Author of the emotion module
   */
  author: string;
}

/**
 * Factory function type for creating emotion modules
 */
export type EmotionModuleFactory = (config?: BaseConfig) => EmotionModule;