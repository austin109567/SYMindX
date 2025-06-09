/**
 * Emotion modules index for SYMindX
 * 
 * This file exports all available emotion modules
 */

import { EmotionConfig } from '../../../types/agent.js'
import { EmotionModule } from '../../../types/emotion.js'

// Import all emotion modules
import { HappyEmotionModule, createHappyEmotionModule } from './happy/index.js'
import { SadEmotionModule, createSadEmotionModule } from './sad/index.js'
import { AngryEmotionModule, createAngryEmotionModule } from './angry/index.js'

// Export all emotion module types
export {
  HappyEmotionModule,
  SadEmotionModule,
  AngryEmotionModule
}

// Map of emotion module types to their factory functions
const emotionModuleFactories: Record<string, (config: EmotionConfig) => EmotionModule> = {
  'happy': createHappyEmotionModule,
  'sad': createSadEmotionModule,
  'angry': createAngryEmotionModule
}

/**
 * Create an emotion module based on the specified type
 * @param type The type of emotion module to create
 * @param config Configuration for the emotion module
 * @returns An instance of the requested emotion module
 */
export function createEmotionModule(type: string, config: EmotionConfig): EmotionModule {
  const factory = emotionModuleFactories[type]
  if (!factory) {
    throw new Error(`Unknown emotion module type: ${type}`)
  }
  
  return factory(config)
}

/**
 * Get a list of all available emotion module types
 * @returns Array of emotion module type names
 */
export function getAvailableEmotionModules(): string[] {
  return Object.keys(emotionModuleFactories)
}