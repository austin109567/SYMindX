import { Extension, Agent, ActionResult, ExtensionAction, ExtensionEventHandler, ActionResultType, ExtensionType, ExtensionStatus, ActionCategory } from '../../types/agent.js'
import { GenericData, BaseConfig, SkillParameters } from '../../types/common.js'
import { Client } from '@modelcontextprotocol/sdk/client/index'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse'
import { spawn, ChildProcess } from 'child_process'
import {
  McpClientConfig,
  McpServerConfig,
  McpClientInstance,
  McpToolCall,
  McpResourceRequest,
  McpPromptRequest,
  McpCallResult,
  McpServerStatus,
  EnhancedExtension,
  ExtensionLifecycle,
  SandboxConfig
} from './types.js'
import { initializeSkills } from './skills/index.js'

export class McpClientExtension implements Extension, EnhancedExtension {
  name = 'mcp-client'
  type = ExtensionType.INTEGRATION
  version = '1.0.0'
  description = 'MCP Client Extension for connecting to MCP servers'
  status = ExtensionStatus.DISABLED
  category = ActionCategory.INTEGRATION
  
  config: McpClientConfig
  
  // Enhanced Extension Properties
  metadata = {
    author: 'SYMindX Team',
    license: 'MIT',
    repository: 'https://github.com/symindx/mind-agents',
    documentation: 'https://docs.symindx.com/extensions/mcp-client',
    tags: ['mcp', 'client', 'integration', 'protocol'],
    compatibility: {
      minAgentVersion: '1.0.0',
      maxAgentVersion: '2.0.0'
    }
  }
  
  sandboxing: SandboxConfig = {
    enabled: true,
    permissions: ['network', 'process'],
    resourceLimits: {
      memory: 512 * 1024 * 1024, // 512MB
      cpu: 80, // 80% CPU
      network: true,
      filesystem: false
    }
  }
  
  lifecycle: ExtensionLifecycle = {
    onLoad: async () => {
      console.log('🔌 MCP Client extension loaded')
    },
    onUnload: async () => {
      await this.disconnectAll()
      console.log('🔌 MCP Client extension unloaded')
    },
    onReload: async () => {
      await this.disconnectAll()
      await this.connectToServers()
      console.log('🔌 MCP Client extension reloaded')
    },
    onError: async (error: Error) => {
      console.error('❌ MCP Client extension error:', error)
      await this.handleError(error)
    }
  }
  
  private clients: Map<string, McpClientInstance> = new Map()
  private agent?: Agent
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  private processes: Map<string, ChildProcess> = new Map()
  private skills: ReturnType<typeof initializeSkills>

  constructor(config: McpClientConfig) {
    this.config = {
      ...config
    }
  }

  async init(agent: Agent): Promise<void> {
    if (!this.config.enabled) {
      console.log('🔌 MCP Client Extension disabled')
      return
    }

    this.status = ExtensionStatus.INITIALIZING
    this.agent = agent
    console.log('🔌 Initializing MCP Client Extension...')

    // Initialize skills
    this.skills = initializeSkills(this)

    if (this.config.autoConnect) {
      await this.connectToServers()
    }

    this.status = ExtensionStatus.ENABLED
    console.log('✅ MCP Client Extension initialized successfully')
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up MCP Client Extension...')
    await this.disconnectAll()
    
    // Clear all timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer)
    }
    this.reconnectTimers.clear()
    
    // Kill all processes
    for (const [name, process] of this.processes.entries()) {
      console.log(`🔪 Killing MCP server process: ${name}`)
      process.kill('SIGTERM')
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL')
        }
      }, 5000)
    }
    this.processes.clear()
    
    this.status = ExtensionStatus.DISABLED
    console.log('✅ MCP Client Extension cleaned up')
  }

  private async connectToServers(): Promise<void> {
    const enabledServers = this.config.servers.filter(s => s.enabled)
    
    for (const serverConfig of enabledServers) {
      try {
        await this.connectToServer(serverConfig)
      } catch (error) {
        console.error(`❌ Failed to connect to MCP server ${serverConfig.name}:`, error)
      }
    }
  }

  private async connectToServer(serverConfig: McpServerConfig): Promise<void> {
    console.log(`🔗 Connecting to MCP server: ${serverConfig.name}`)

    try {
      let transport
      let process: ChildProcess | undefined

      if (serverConfig.transport === 'stdio') {
        // Start the server process
        process = spawn(serverConfig.command, serverConfig.args || [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...serverConfig.env }
        })

        this.processes.set(serverConfig.name, process)

        // Handle process events
        process.on('error', (error) => {
          console.error(`❌ MCP server process error (${serverConfig.name}):`, error)
          this.handleError(error)
        })

        process.on('exit', (code, signal) => {
          console.log(`🔄 MCP server process exited (${serverConfig.name}): code=${code}, signal=${signal}`)
          this.processes.delete(serverConfig.name)
          
          // Attempt reconnection if enabled
          if (this.config.reconnect?.enabled && code !== 0) {
            this.scheduleReconnect(serverConfig.name)
          }
        })

        transport = new StdioClientTransport({
          command: serverConfig.command,
          args: serverConfig.args || [],
          env: serverConfig.env
        })
      } else if (serverConfig.transport === 'sse') {
        transport = new SSEClientTransport(new URL(serverConfig.url!))
      } else {
        throw new Error(`Unsupported transport: ${serverConfig.transport}`)
      }

      const client = new Client({
        name: `mind-agent-${this.agent?.id || 'unknown'}`,
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      })

      await client.connect(transport)

      // Get server capabilities
      const tools = await client.listTools()
      const resources = await client.listResources()
      const prompts = await client.listPrompts()

      const clientInstance: McpClientInstance = {
        name: serverConfig.name,
        client,
        transport,
        process,
        config: serverConfig,
        tools: tools.tools || [],
        resources: resources.resources || [],
        prompts: prompts.prompts || [],
        connected: true,
        lastActivity: new Date()
      }

      this.clients.set(serverConfig.name, clientInstance)
      
      console.log(`✅ Connected to MCP server: ${serverConfig.name}`)
      console.log(`📊 Server capabilities:`, {
        tools: tools.tools?.length || 0,
        resources: resources.resources?.length || 0,
        prompts: prompts.prompts?.length || 0
      })

      // Emit connection event
      this.agent?.eventBus.emit('serverConnected', {
        serverName: serverConfig.name,
        capabilities: {
          tools: tools.tools?.length || 0,
          resources: resources.resources?.length || 0,
          prompts: prompts.prompts?.length || 0
        },
        timestamp: new Date(),
        processed: false
      })
    } catch (error) {
      console.error(`❌ Failed to connect to MCP server ${serverConfig.name}:`, error)
      throw error
    }
  }

  private scheduleReconnect(serverName: string): void {
    const reconnectConfig = this.config.reconnect
    if (!reconnectConfig?.enabled) return

    const delay = reconnectConfig.delay || 5000
    console.log(`⏰ Scheduling reconnection for ${serverName} in ${delay}ms`)

    const timer = setTimeout(async () => {
      try {
        await this.reconnectServer(serverName)
      } catch (error) {
        console.error(`❌ Reconnection failed for ${serverName}:`, error)
      }
    }, delay)

    this.reconnectTimers.set(serverName, timer)
  }

  private async reconnectServer(serverName: string): Promise<void> {
    const serverConfig = this.config.servers.find(s => s.name === serverName)
    if (!serverConfig) return

    // Clear existing timer
    const existingTimer = this.reconnectTimers.get(serverName)
    if (existingTimer) {
      clearTimeout(existingTimer)
      this.reconnectTimers.delete(serverName)
    }

    // Disconnect existing client if any
    const existingClient = this.clients.get(serverName)
    if (existingClient) {
      try {
        await existingClient.client.close()
      } catch (error) {
        console.warn(`⚠️ Error closing existing client for ${serverName}:`, error)
      }
      this.clients.delete(serverName)
    }

    // Attempt reconnection
    try {
      await this.connectToServer(serverConfig)
      console.log(`✅ Successfully reconnected to ${serverName}`)
    } catch (error) {
      console.error(`❌ Reconnection failed for ${serverName}:`, error)
      
      // Schedule another reconnection attempt
      const maxRetries = this.config.reconnect?.maxRetries || 5
      const currentRetries = this.reconnectTimers.size // Simple retry tracking
      
      if (currentRetries < maxRetries) {
        this.scheduleReconnect(serverName)
      } else {
        console.error(`❌ Max reconnection attempts reached for ${serverName}`)
      }
    }
  }

  private async disconnectAll(): Promise<void> {
    console.log('🔌 Disconnecting all MCP clients...')
    
    for (const [name, clientInstance] of this.clients.entries()) {
      try {
        await clientInstance.client.close()
        console.log(`✅ Disconnected from MCP server: ${name}`)
        
        // Emit disconnection event
        this.agent?.eventBus.emit('serverDisconnected', {
          serverName: name,
          timestamp: new Date(),
          processed: false
        })
      } catch (error) {
        console.error(`❌ Error disconnecting from ${name}:`, error)
      }
    }
    
    this.clients.clear()
  }

  private async handleError(error: Error): Promise<void> {
    console.error('❌ MCP Client Extension error:', error)
    
    // Emit error event
    this.agent?.eventBus.emit('extensionError', {
      extensionName: this.name,
      error: error.message,
      timestamp: new Date(),
      processed: false
    })
  }

  // Get all actions from skills and legacy actions
  get actions(): Record<string, ExtensionAction> {
    const skillActions: Record<string, ExtensionAction> = {}
    
    // Collect actions from all skills
    if (this.skills) {
      Object.values(this.skills).forEach(skill => {
        const actions = skill.getActions()
        Object.assign(skillActions, actions)
      })
    }
    
    // Legacy actions for backward compatibility
    const legacyActions: Record<string, ExtensionAction> = {
      callTool: {
        name: 'callTool',
        description: 'Call a tool on a connected MCP server',
        category: ActionCategory.INTEGRATION,
        parameters: {
          serverName: { type: 'string', required: true, description: 'Name of the MCP server' },
          toolName: { type: 'string', required: true, description: 'Name of the tool to call' },
          arguments: { type: 'object', required: false, description: 'Arguments for the tool' }
        },
        handler: async (params: SkillParameters): Promise<ActionResult> => {
          return await this.callTool(params as McpToolCall)
        }
      },
      getResource: {
        name: 'getResource',
        description: 'Get a resource from a connected MCP server',
        category: ActionCategory.INTEGRATION,
        parameters: {
          serverName: { type: 'string', required: true, description: 'Name of the MCP server' },
          uri: { type: 'string', required: true, description: 'URI of the resource' }
        },
        handler: async (params: SkillParameters): Promise<ActionResult> => {
          return await this.getResource(params as McpResourceRequest)
        }
      },
      getPrompt: {
        name: 'getPrompt',
        description: 'Get a prompt from a connected MCP server',
        category: ActionCategory.INTEGRATION,
        parameters: {
          serverName: { type: 'string', required: true, description: 'Name of the MCP server' },
          name: { type: 'string', required: true, description: 'Name of the prompt' },
          arguments: { type: 'object', required: false, description: 'Arguments for the prompt' }
        },
        handler: async (params: SkillParameters): Promise<ActionResult> => {
          return await this.getPrompt(params as McpPromptRequest)
        }
      },
      listServers: {
        name: 'listServers',
        description: 'List all connected MCP servers and their capabilities',
        category: ActionCategory.INTEGRATION,
        parameters: {},
        handler: async (): Promise<ActionResult> => {
          return await this.listServers()
        }
      },
      getServerStatus: {
        name: 'getServerStatus',
        description: 'Get the status of a specific MCP server',
        category: ActionCategory.INTEGRATION,
        parameters: {
          serverName: { type: 'string', required: true, description: 'Name of the MCP server' }
        },
        handler: async (params: SkillParameters): Promise<ActionResult> => {
          return await this.getServerStatus(params.serverName as string)
        }
      },
      reconnectServer: {
        name: 'reconnectServer',
        description: 'Reconnect to a specific MCP server',
        category: ActionCategory.INTEGRATION,
        parameters: {
          serverName: { type: 'string', required: true, description: 'Name of the MCP server' }
        },
        handler: async (params: SkillParameters): Promise<ActionResult> => {
          try {
            await this.reconnectServer(params.serverName as string)
            return {
              type: ActionResultType.SUCCESS,
              message: `Successfully reconnected to server: ${params.serverName}`,
              result: { serverName: params.serverName, status: 'reconnected' } as unknown as GenericData
            }
          } catch (error) {
            return {
              type: ActionResultType.ERROR,
              message: `Failed to reconnect to server: ${params.serverName}`,
              error: error instanceof Error ? error.message : String(error)
            }
          }
        }
      }
    }
    
    return { ...skillActions, ...legacyActions }
  }

  // Extension Events
  events: Record<string, ExtensionEventHandler> = {
    serverConnected: {
      name: 'serverConnected',
      description: 'Fired when an MCP server connects',
      handler: async (data: GenericData) => {
        console.log('📡 MCP server connected:', data)
      }
    },
    serverDisconnected: {
      name: 'serverDisconnected',
      description: 'Fired when an MCP server disconnects',
      handler: async (data: GenericData) => {
        console.log('📡 MCP server disconnected:', data)
      }
    }
  }

  // Legacy action implementations
  private async callTool(request: McpToolCall): Promise<ActionResult> {
    try {
      const clientInstance = this.clients.get(request.serverName)
      if (!clientInstance) {
        return {
          type: ActionResultType.ERROR,
          message: `MCP server not found: ${request.serverName}`,
          error: 'Server not connected'
        }
      }

      if (!clientInstance.connected) {
        return {
          type: ActionResultType.ERROR,
          message: `MCP server not connected: ${request.serverName}`,
          error: 'Server disconnected'
        }
      }

      // Update last activity
      clientInstance.lastActivity = new Date()

      const result = await clientInstance.client.callTool({
        name: request.toolName,
        arguments: request.arguments || {}
      })

      // Emit tool call event
      this.agent?.eventBus.emit('mcpToolCalled', {
        serverName: request.serverName,
        toolName: request.toolName,
        arguments: request.arguments,
        result,
        timestamp: new Date(),
        processed: false
      })

      return {
        type: ActionResultType.SUCCESS,
        message: `Tool ${request.toolName} executed successfully`,
        result: result as unknown as GenericData
      }
    } catch (error) {
      return {
        type: ActionResultType.ERROR,
        message: `Failed to call tool ${request.toolName}`,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async getResource(request: McpResourceRequest): Promise<ActionResult> {
    try {
      const clientInstance = this.clients.get(request.serverName)
      if (!clientInstance) {
        return {
          type: ActionResultType.ERROR,
          message: `MCP server not found: ${request.serverName}`,
          error: 'Server not connected'
        }
      }

      if (!clientInstance.connected) {
        return {
          type: ActionResultType.ERROR,
          message: `MCP server not connected: ${request.serverName}`,
          error: 'Server disconnected'
        }
      }

      // Update last activity
      clientInstance.lastActivity = new Date()

      const result = await clientInstance.client.readResource({ uri: request.uri })

      return {
        type: ActionResultType.SUCCESS,
        message: `Resource retrieved successfully: ${request.uri}`,
        result: result as unknown as GenericData
      }
    } catch (error) {
      return {
        type: ActionResultType.ERROR,
        message: `Failed to get resource: ${request.uri}`,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async getPrompt(request: McpPromptRequest): Promise<ActionResult> {
    try {
      const clientInstance = this.clients.get(request.serverName)
      if (!clientInstance) {
        return {
          type: ActionResultType.ERROR,
          message: `MCP server not found: ${request.serverName}`,
          error: 'Server not connected'
        }
      }

      if (!clientInstance.connected) {
        return {
          type: ActionResultType.ERROR,
          message: `MCP server not connected: ${request.serverName}`,
          error: 'Server disconnected'
        }
      }

      // Update last activity
      clientInstance.lastActivity = new Date()

      const result = await clientInstance.client.getPrompt({
        name: request.name,
        arguments: request.arguments || {}
      })

      return {
        type: ActionResultType.SUCCESS,
        message: `Prompt retrieved successfully: ${request.name}`,
        result: result as unknown as GenericData
      }
    } catch (error) {
      return {
        type: ActionResultType.ERROR,
        message: `Failed to get prompt: ${request.name}`,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async listServers(): Promise<ActionResult> {
    const servers: McpServerStatus[] = []
    
    for (const [name, clientInstance] of this.clients.entries()) {
      servers.push({
        name,
        connected: clientInstance.connected,
        transport: clientInstance.config.transport,
        capabilities: {
          tools: clientInstance.tools.length,
          resources: clientInstance.resources.length,
          prompts: clientInstance.prompts.length
        },
        lastActivity: clientInstance.lastActivity
      })
    }
    
    return {
      type: ActionResultType.SUCCESS,
      message: `Found ${servers.length} MCP servers`,
      result: servers as unknown as GenericData
    }
  }

  private async getServerStatus(serverName: string): Promise<ActionResult> {
    const clientInstance = this.clients.get(serverName)
    if (!clientInstance) {
      return {
        type: ActionResultType.ERROR,
        message: `MCP server not found: ${serverName}`,
        error: 'Server not found'
      }
    }

    const status: McpServerStatus = {
      name: serverName,
      connected: clientInstance.connected,
      transport: clientInstance.config.transport,
      capabilities: {
        tools: clientInstance.tools.length,
        resources: clientInstance.resources.length,
        prompts: clientInstance.prompts.length
      },
      lastActivity: clientInstance.lastActivity,
      tools: clientInstance.tools,
      resources: clientInstance.resources,
      prompts: clientInstance.prompts
    }

    return {
      type: ActionResultType.SUCCESS,
      message: `Server status retrieved: ${serverName}`,
      result: status as unknown as GenericData
    }
  }

  // Utility methods for getting available capabilities
  getAvailableTools(): Array<{ serverName: string; tools: any[] }> {
    const result: Array<{ serverName: string; tools: any[] }> = []
    
    for (const [serverName, clientInstance] of this.clients.entries()) {
      if (clientInstance.connected) {
        result.push({
          serverName,
          tools: clientInstance.tools
        })
      }
    }
    
    return result
  }

  getAvailableResources(): Array<{ serverName: string; resources: any[] }> {
    const result: Array<{ serverName: string; resources: any[] }> = []
    
    for (const [serverName, clientInstance] of this.clients.entries()) {
      if (clientInstance.connected) {
        result.push({
          serverName,
          resources: clientInstance.resources
        })
      }
    }
    
    return result
  }

  getAvailablePrompts(): Array<{ serverName: string; prompts: any[] }> {
    const result: Array<{ serverName: string; prompts: any[] }> = []
    
    for (const [serverName, clientInstance] of this.clients.entries()) {
      if (clientInstance.connected) {
        result.push({
          serverName,
          prompts: clientInstance.prompts
        })
      }
    }
    
    return result
  }
}