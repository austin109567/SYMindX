/**
 * Cognition Module Factory
 * 
 * This file exports all available cognition modules and provides factory functions
 * for creating them based on type.
 */

// Import from cognitive functions
import {
  HTNPlannerCognition,
  ReactiveCognition,
  HybridCognition,
  createHTNPlannerCognition,
  createReactiveCognition,
  createHybridCognition,
  getAvailableCognitionModuleTypes
} from './cognitive-functions/index.js'

/**
 * Create a cognition module based on type and configuration
 * @param type The type of cognition module to create
 * @param config The configuration for the cognition module
 * @returns The created cognition module
 */
export function createCognitionModule(type: string, config: any) {
  switch (type) {
    case 'htn_planner':
      return createHTNPlannerCognition(config)
    case 'reactive':
      return createReactiveCognition(config)
    case 'hybrid':
      return createHybridCognition(config)
    default:
      throw new Error(`Unknown cognition module type: ${type}`)
  }
}

/**
 * Get all available cognition module types
 * @returns Array of available cognition module types
 */
export function getCognitionModuleTypes(): string[] {
  return getAvailableCognitionModuleTypes()
}

// Export all cognition modules
export {
  HTNPlannerCognition,
  ReactiveCognition,
  HybridCognition
}