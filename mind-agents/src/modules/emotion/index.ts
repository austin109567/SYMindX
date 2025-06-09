/**
 * Emotion module for SYMindX
 * 
 * This module provides different implementations of emotion systems
 * for agents to express and process emotions.
 */

import { EmotionConfig, EmotionModuleType } from '../../types/agent.js'
import { EmotionModule } from '../../types/emotion.js'
import { RuneEmotionStack } from './rune-emotion-stack.js'
import { createEmotionModule as createModularEmotionModule, getAvailableEmotionModules } from './emotions/index.js'

/**
 * Create an emotion module based on configuration
 * @param type The type of emotion module to create
 * @param config Configuration options for the module
 * @returns A configured emotion module instance
 */
export function createEmotionModule(
  type: EmotionModuleType | string,
  config: EmotionConfig
): EmotionModule {
  // Legacy emotion modules
  if (type === EmotionModuleType.RUNE_EMOTION_STACK) {
    return new RuneEmotionStack(config)
  }
  
  // Try to load from modular emotion system
  try {
    return createModularEmotionModule(type, config)
  } catch (error) {
    throw new Error(`Unknown emotion module type: ${type}`)
  }
}

/**
 * Get all available emotion module types
 * @returns Array of emotion module type names
 */
export function getEmotionModuleTypes(): (EmotionModuleType | string)[] {
  // Combine legacy and modular emotion types
  return [
    EmotionModuleType.RUNE_EMOTION_STACK,
    ...getAvailableEmotionModules()
  ]
}

export {
  RuneEmotionStack
}