/**
 * Channel Management Skill for Slack Extension
 * 
 * Provides actions related to managing Slack channels.
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { SlackExtension } from '../index.js'

export class ChannelManagementSkill {
  private extension: SlackExtension

  constructor(extension: SlackExtension) {
    this.extension = extension
  }

  /**
   * Get all channel management-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      create_channel: {
        name: 'create_channel',
        description: 'Create a new Slack channel',
        category: ActionCategory.SYSTEM,
        parameters: { name: 'string', is_private: 'boolean', purpose: 'string', topic: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.createChannel(params.name, params.is_private, params.purpose, params.topic)
        }
      },
      
      join_channel: {
        name: 'join_channel',
        description: 'Join a Slack channel',
        category: ActionCategory.SOCIAL,
        parameters: { channel: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.joinChannel(params.channel)
        }
      },
      
      leave_channel: {
        name: 'leave_channel',
        description: 'Leave a Slack channel',
        category: ActionCategory.SOCIAL,
        parameters: { channel: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.leaveChannel(params.channel)
        }
      },
      
      archive_channel: {
        name: 'archive_channel',
        description: 'Archive a Slack channel',
        category: ActionCategory.SYSTEM,
        parameters: { channel: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.archiveChannel(params.channel)
        }
      },
      
      unarchive_channel: {
        name: 'unarchive_channel',
        description: 'Unarchive a Slack channel',
        category: ActionCategory.SYSTEM,
        parameters: { channel: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.unarchiveChannel(params.channel)
        }
      },
      
      set_channel_topic: {
        name: 'set_channel_topic',
        description: 'Set the topic for a Slack channel',
        category: ActionCategory.SYSTEM,
        parameters: { channel: 'string', topic: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.setChannelTopic(params.channel, params.topic)
        }
      },
      
      set_channel_purpose: {
        name: 'set_channel_purpose',
        description: 'Set the purpose for a Slack channel',
        category: ActionCategory.SYSTEM,
        parameters: { channel: 'string', purpose: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.setChannelPurpose(params.channel, params.purpose)
        }
      },
      
      get_channel_info: {
        name: 'get_channel_info',
        description: 'Get information about a Slack channel',
        category: ActionCategory.OBSERVATION,
        parameters: { channel: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getChannelInfo(params.channel)
        }
      },
      
      list_channels: {
        name: 'list_channels',
        description: 'List all channels the bot has access to',
        category: ActionCategory.OBSERVATION,
        parameters: { types: 'string', exclude_archived: 'boolean' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.listChannels(params.types, params.exclude_archived)
        }
      }
    }
  }

  /**
   * Create a new Slack channel
   */
  async createChannel(name: string, isPrivate: boolean = false, purpose?: string, topic?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.createChannel(name, isPrivate, purpose, topic)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create channel: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Join a Slack channel
   */
  async joinChannel(channel: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.joinChannel(channel)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to join channel: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Leave a Slack channel
   */
  async leaveChannel(channel: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.leaveChannel(channel)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to leave channel: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Archive a Slack channel
   */
  async archiveChannel(channel: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.archiveChannel(channel)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to archive channel: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Unarchive a Slack channel
   */
  async unarchiveChannel(channel: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.unarchiveChannel(channel)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to unarchive channel: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Set the topic for a Slack channel
   */
  async setChannelTopic(channel: string, topic: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.setChannelTopic(channel, topic)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to set channel topic: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Set the purpose for a Slack channel
   */
  async setChannelPurpose(channel: string, purpose: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.setChannelPurpose(channel, purpose)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to set channel purpose: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Get information about a Slack channel
   */
  async getChannelInfo(channel: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.getChannelInfo(channel)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get channel info: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * List all channels the bot has access to
   */
  async listChannels(types?: string, excludeArchived: boolean = true): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.listChannels(types, excludeArchived)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list channels: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}