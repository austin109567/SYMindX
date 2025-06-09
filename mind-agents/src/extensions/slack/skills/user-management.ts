/**
 * User Management Skill for Slack Extension
 * 
 * Provides actions related to managing users and user interactions in Slack.
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { SlackExtension } from '../index.js'

export class UserManagementSkill {
  private extension: SlackExtension

  constructor(extension: SlackExtension) {
    this.extension = extension
  }

  /**
   * Get all user management-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      get_user_info: {
        name: 'get_user_info',
        description: 'Get information about a Slack user',
        category: ActionCategory.OBSERVATION,
        parameters: { user: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getUserInfo(params.user)
        }
      },
      
      get_user_presence: {
        name: 'get_user_presence',
        description: 'Get the presence status of a user',
        category: ActionCategory.OBSERVATION,
        parameters: { user: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getUserPresence(params.user)
        }
      },
      
      invite_user_to_channel: {
        name: 'invite_user_to_channel',
        description: 'Invite a user to a channel',
        category: ActionCategory.SOCIAL,
        parameters: { channel: 'string', user: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.inviteUserToChannel(params.channel, params.user)
        }
      },
      
      kick_user_from_channel: {
        name: 'kick_user_from_channel',
        description: 'Remove a user from a channel',
        category: ActionCategory.SOCIAL,
        parameters: { channel: 'string', user: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.kickUserFromChannel(params.channel, params.user)
        }
      },
      
      list_channel_members: {
        name: 'list_channel_members',
        description: 'List all members of a channel',
        category: ActionCategory.OBSERVATION,
        parameters: { channel: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.listChannelMembers(params.channel)
        }
      },
      
      send_direct_message: {
        name: 'send_direct_message',
        description: 'Send a direct message to a user',
        category: ActionCategory.COMMUNICATION,
        parameters: { user: 'string', message: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendDirectMessage(agent, params.user, params.message)
        }
      },
      
      update_status: {
        name: 'update_status',
        description: 'Update the bot\'s Slack status',
        category: ActionCategory.SYSTEM,
        parameters: { status: 'string', emoji: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.updateBotStatus(params.status, params.emoji)
        }
      },
      
      set_user_preferences: {
        name: 'set_user_preferences',
        description: 'Set preferences for a user',
        category: ActionCategory.SYSTEM,
        parameters: { user: 'string', preferences: 'object' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.setUserPreferences(params.user, params.preferences)
        }
      },
      
      get_user_preferences: {
        name: 'get_user_preferences',
        description: 'Get preferences for a user',
        category: ActionCategory.OBSERVATION,
        parameters: { user: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getUserPreferences(params.user)
        }
      }
    }
  }

  /**
   * Get information about a Slack user
   */
  async getUserInfo(user: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.getUserInfo(user)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get user info: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Get the presence status of a user
   */
  async getUserPresence(user: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.getUserPresence(user)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get user presence: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Invite a user to a channel
   */
  async inviteUserToChannel(channel: string, user: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.inviteUserToChannel(channel, user)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to invite user to channel: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Remove a user from a channel
   */
  async kickUserFromChannel(channel: string, user: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.kickUserFromChannel(channel, user)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to kick user from channel: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * List all members of a channel
   */
  async listChannelMembers(channel: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.listChannelMembers(channel)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list channel members: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Send a direct message to a user
   */
  async sendDirectMessage(agent: Agent, user: string, message: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.sendDirectMessage(agent, user, message)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to send direct message: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Update the bot's Slack status
   */
  async updateBotStatus(status: string, emoji?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.updateBotStatus(status, emoji)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to update bot status: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Set preferences for a user
   */
  async setUserPreferences(user: string, preferences: any): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.setUserPreferences(user, preferences)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to set user preferences: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Get preferences for a user
   */
  async getUserPreferences(user: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.getUserPreferences(user)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get user preferences: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}