/**
 * MCP Extension Types
 * 
 * This file defines the types for the Model Context Protocol extension.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Tool, Resource, Prompt } from '@modelcontextprotocol/sdk/types.js'

export interface McpConfig {
  enabled: boolean
  serverName: string
  serverVersion: string
  port?: number
  transport: 'stdio' | 'http'
  tools: McpToolConfig[]
  resources: McpResourceConfig[]
  prompts: McpPromptConfig[]
  capabilities?: {
    resources?: boolean
    tools?: boolean
    prompts?: boolean
    logging?: boolean
  }
}

export interface McpToolConfig {
  name: string
  description: string
  inputSchema: any
  handler: string // Reference to the handler function
}

export interface McpResourceConfig {
  name: string
  uri: string
  description?: string
  mimeType?: string
  handler: string // Reference to the handler function
}

export interface McpPromptConfig {
  name: string
  description: string
  arguments?: any
  handler: string // Reference to the handler function
}

export interface McpServerInstance {
  server: McpServer
  transport: StdioServerTransport
  isRunning: boolean
}

export interface McpToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

export interface McpResourceResult {
  contents: Array<{
    uri: string
    mimeType?: string
    text?: string
    blob?: string
  }>
}

export interface McpPromptResult {
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: {
      type: 'text' | 'image'
      text?: string
      data?: string
      mimeType?: string
    }
  }>
}

export interface McpContext {
  agentId: string
  sessionId?: string
  metadata?: Record<string, any>
}