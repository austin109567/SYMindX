/**
 * Combat Skill for RuneLite Extension
 * 
 * Provides actions related to combat in the game world.
 */

import { ExtensionAction, Agent, ActionResult } from '../../../types/agent.js'
import { RuneLiteExtension } from '../index.js'

export class CombatSkill {
  private extension: RuneLiteExtension

  constructor(extension: RuneLiteExtension) {
    this.extension = extension
  }

  /**
   * Get all combat-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      attack: {
        name: 'attack',
        description: 'Attack a target NPC or player',
        parameters: { targetId: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.attack(params.targetId)
        }
      },
      
      cast_spell: {
        name: 'cast_spell',
        description: 'Cast a magic spell',
        parameters: { spellName: 'string', targetId: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.castSpell(params.spellName, params.targetId)
        }
      }
    }
  }

  /**
   * Attack a target NPC or player
   */
  async attack(targetId: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send attack command to RuneLite
      await this.extension.sendCommand({
        action: 'attack',
        target: targetId
      })

      return {
        success: true,
        result: { targetId },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to attack target: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Cast a magic spell on a target
   */
  async castSpell(spellName: string, targetId: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send cast spell command to RuneLite
      await this.extension.sendCommand({
        action: 'cast_spell',
        target: targetId,
        parameters: { spellName }
      })

      return {
        success: true,
        result: { spellName, targetId },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to cast spell: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}