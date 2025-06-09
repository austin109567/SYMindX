/**
 * Base Skill for Twitter Extension
 * 
 * Provides the foundation for all Twitter skills.
 */

import { ExtensionAction, Agent, ActionResult } from '../../../types/agent.js';
import { TwitterExtension } from '../index.js';
import { TwitterActionType, TwitterErrorType } from '../types.js';

/**
 * Base skill interface that all Twitter skills must implement
 */
export interface TwitterSkill {
  /**
   * Get all actions provided by this skill
   */
  getActions(): Record<string, ExtensionAction>;
}

/**
 * Abstract base class for Twitter skills
 */
export abstract class BaseTwitterSkill implements TwitterSkill {
  protected extension: TwitterExtension;
  
  constructor(extension: TwitterExtension) {
    this.extension = extension;
  }
  
  /**
   * Get all actions provided by this skill
   * Must be implemented by subclasses
   */
  abstract getActions(): Record<string, ExtensionAction>;
  
  /**
   * Create a standardized error result
   */
  protected createErrorResult(error: unknown, errorType: TwitterErrorType = TwitterErrorType.INTERNAL_ERROR): ActionResult {
    return {
      success: false,
      error: `${errorType}: ${error instanceof Error ? error.message : String(error)}`,
      metadata: { 
        timestamp: new Date().toISOString(),
        errorType
      }
    };
  }
  
  /**
   * Create a standardized success result
   */
  protected createSuccessResult(data?: any): ActionResult {
    return {
      success: true,
      result: data,
      metadata: { timestamp: new Date().toISOString() }
    };
  }
}