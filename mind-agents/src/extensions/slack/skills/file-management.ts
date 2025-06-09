/**
 * File Management Skill for Slack Extension
 * 
 * Provides actions related to managing files in Slack.
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { SlackExtension } from '../index.js'

export class FileManagementSkill {
  private extension: SlackExtension

  constructor(extension: SlackExtension) {
    this.extension = extension
  }

  /**
   * Get all file management-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      upload_file: {
        name: 'upload_file',
        description: 'Upload a file to Slack',
        category: ActionCategory.SYSTEM,
        parameters: { channel: 'string', file_path: 'string', title: 'string', initial_comment: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.uploadFile(params.channel, params.file_path, params.title, params.initial_comment)
        }
      },
      
      share_file: {
        name: 'share_file',
        description: 'Share an existing file to a channel',
        category: ActionCategory.COMMUNICATION,
        parameters: { file: 'string', channel: 'string', comment: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.shareFile(params.file, params.channel, params.comment)
        }
      },
      
      get_file_info: {
        name: 'get_file_info',
        description: 'Get information about a file',
        category: ActionCategory.OBSERVATION,
        parameters: { file: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getFileInfo(params.file)
        }
      },
      
      delete_file: {
        name: 'delete_file',
        description: 'Delete a file',
        category: ActionCategory.SYSTEM,
        parameters: { file: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.deleteFile(params.file)
        }
      },
      
      list_files: {
        name: 'list_files',
        description: 'List files in a channel or for a user',
        category: ActionCategory.OBSERVATION,
        parameters: { channel: 'string', user: 'string', types: 'string', count: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.listFiles(params.channel, params.user, params.types, params.count)
        }
      },
      
      create_snippet: {
        name: 'create_snippet',
        description: 'Create a code snippet',
        category: ActionCategory.COMMUNICATION,
        parameters: { channel: 'string', content: 'string', title: 'string', filetype: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.createSnippet(params.channel, params.content, params.title, params.filetype)
        }
      },
      
      download_file: {
        name: 'download_file',
        description: 'Download a file from Slack',
        category: ActionCategory.SYSTEM,
        parameters: { file: 'string', destination: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.downloadFile(params.file, params.destination)
        }
      }
    }
  }

  /**
   * Upload a file to Slack
   */
  async uploadFile(channel: string, filePath: string, title?: string, initialComment?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.uploadFile(channel, filePath, title, initialComment)
    } catch (error) {
      return {
        success: false,
        error: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`,
        type: ActionResultType.FAILURE,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Share an existing file to a channel
   */
  async shareFile(file: string, channel: string, comment?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.shareFile(file, channel, comment)
    } catch (error) {
      return {
        success: false,
        error: `Failed to share file: ${error instanceof Error ? error.message : String(error)}`,
        type: ActionResultType.FAILURE,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Get information about a file
   */
  async getFileInfo(file: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.getFileInfo(file)
    } catch (error) {
      return {
        success: false,
        error: `Failed to get file info: ${error instanceof Error ? error.message : String(error)}`,
        type: ActionResultType.FAILURE,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(file: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.deleteFile(file)
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
        type: ActionResultType.FAILURE,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * List files in a channel or for a user
   */
  async listFiles(channel?: string, user?: string, types?: string, count?: number): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.listFiles(channel, user, types, count)
    } catch (error) {
      return {
        success: false,
        error: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
        type: ActionResultType.FAILURE,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Create a code snippet
   */
  async createSnippet(channel: string, content: string, title?: string, filetype?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.createSnippet(channel, content, title, filetype)
    } catch (error) {
      return {
        success: false,
        error: `Failed to create snippet: ${error instanceof Error ? error.message : String(error)}`,
        type: ActionResultType.FAILURE,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Download a file from Slack
   */
  async downloadFile(file: string, destination: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.downloadFile(file, destination)
    } catch (error) {
      return {
        success: false,
        error: `Failed to download file: ${error instanceof Error ? error.message : String(error)}`,
        type: ActionResultType.FAILURE,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}