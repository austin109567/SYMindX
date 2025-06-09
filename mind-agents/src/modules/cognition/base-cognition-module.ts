/**
 * Base Cognition Module for SYMindX
 * 
 * This provides a common base implementation for all cognition modules
 */

import { Agent, ThoughtContext, ThoughtResult, Plan, Decision } from '../../types/agent.js'
import { CognitionModule, CognitionModuleMetadata } from '../../types/cognition.js'
import { BaseConfig } from '../../types/common'

/**
 * Abstract base class for all cognition modules
 */
export abstract class BaseCognitionModule implements CognitionModule {
  protected config: BaseConfig
  protected metadata: CognitionModuleMetadata

  constructor(config: BaseConfig, metadata: CognitionModuleMetadata) {
    this.config = config
    this.metadata = metadata
  }

  /**
   * Process the current context and generate thoughts, emotions, and actions
   * @param agent The agent that is thinking
   * @param context The context for thinking
   * @returns The result of thinking
   */
  abstract think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult>

  /**
   * Create a plan to achieve a goal
   * @param agent The agent that is planning
   * @param goal The goal to plan for
   * @returns A plan to achieve the goal
   */
  abstract plan(agent: Agent, goal: string): Promise<Plan>

  /**
   * Make a decision between options
   * @param agent The agent that is deciding
   * @param options The options to decide between
   * @returns The selected decision
   */
  abstract decide(agent: Agent, options: Decision[]): Promise<Decision>

  /**
   * Initialize the cognition module with configuration
   * @param config Configuration for the cognition module
   */
  initialize(config: BaseConfig): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get the metadata for this cognition module
   */
  getMetadata(): CognitionModuleMetadata {
    return this.metadata
  }

  /**
   * Generate a unique ID
   * @returns A unique ID string
   */
  protected generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}