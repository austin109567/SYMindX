/**
 * Interaction Skill for RuneLite Extension
 * 
 * Provides actions related to interacting with objects and NPCs in the game world.
 */

import { ExtensionAction, Agent, ActionResult } from '../../../types/agent.js'
import { RuneLiteExtension } from '../index.js'

export class InteractionSkill {
  private extension: RuneLiteExtension

  constructor(extension: RuneLiteExtension) {
    this.extension = extension
  }

  /**
   * Get all interaction-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      interact: {
        name: 'interact',
        description: 'Interact with an object or NPC',
        parameters: { targetId: 'string', action: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.interact(params.targetId, params.action)
        }
      },
      
      skill_action: {
        name: 'skill_action',
        description: 'Perform a skill-based action',
        parameters: { skill: 'string', action: 'string', targetId: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.skillAction(params.skill, params.action, params.targetId)
        }
      }
    }
  }

  /**
   * Interact with an object or NPC
   */
  async interact(targetId: string, action: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send interaction command to RuneLite
      await this.extension.sendCommand({
        action: 'interact',
        target: targetId,
        parameters: { action }
      })

      return {
        success: true,
        result: { targetId, action },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to interact with target: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Perform a skill-based action on a target
   */
  async skillAction(skill: string, action: string, targetId: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send skill action command to RuneLite
      await this.extension.sendCommand({
        action: 'skill_action',
        target: targetId,
        parameters: { skill, action }
      })

      return {
        success: true,
        result: { skill, action, targetId },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to perform skill action: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}