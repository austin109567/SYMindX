/**
 * SYMindX Modules
 * 
 * This module exports all the core modules used by the SYMindX runtime.
 */

import { createMemoryProvider } from './memory/providers/index.js'
import { createEmotionModule } from './emotion/index.js'
import { createCognitionModule } from './cognition/index.js'
import { EmotionModuleType, MemoryProviderType } from '../types/agent.js'

/**
 * Initialize and register all core modules with the runtime
 * @param registry The module registry to register modules with
 */
export async function registerCoreModules(registry: any): Promise<void> {
  // Register memory providers
  try {
    const inMemoryProvider = createMemoryProvider(MemoryProviderType.MEMORY, { embeddingModel: 'text-embedding-3-small' })
    registry.registerMemoryProvider('memory', inMemoryProvider)
    
    // Only register SQLite if available
    try {
      const sqliteProvider = createMemoryProvider(MemoryProviderType.SQLITE, { 
        dbPath: './data/memories.db',
        embeddingModel: 'text-embedding-3-small'
      })
      registry.registerMemoryProvider('sqlite', sqliteProvider)
    } catch (error) {
      console.warn('⚠️ SQLite memory provider not available:', error instanceof Error ? error.message : String(error))
    }
  } catch (error) {
    console.error('❌ Failed to register memory providers:', error instanceof Error ? error.message : String(error))
  }

  // Register emotion modules
  try {
    const runeEmotionModule = createEmotionModule(EmotionModuleType.RUNE_EMOTION_STACK, {
      type: EmotionModuleType.RUNE_EMOTION_STACK,
      sensitivity: 0.8,
      decayRate: 0.05,
      transitionSpeed: 0.3
    })
    registry.registerEmotionModule(EmotionModuleType.RUNE_EMOTION_STACK, runeEmotionModule)
  } catch (error) {
    console.error('❌ Failed to register emotion modules:', error)
  }

  // Register cognition modules
  try {
    const htnPlannerModule = createCognitionModule('htn_planner', {
      type: 'htn_planner',
      planningDepth: 3,
      memoryIntegration: true,
      creativityLevel: 0.7
    })
    registry.registerCognitionModule('htn_planner', htnPlannerModule)
  } catch (error) {
    console.error('❌ Failed to register cognition modules:', error)
  }

  console.log('✅ Core modules registered')
}

export {
  createMemoryProvider,
  createEmotionModule,
  createCognitionModule
}