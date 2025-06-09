/**
 * API Extension for SYMindX
 * 
 * This extension provides HTTP API endpoints for direct interaction with the agent,
 * including chat, status, memory queries, and action execution.
 */

import express, { Express, Request, Response, NextFunction } from 'express'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { Agent, Extension, ExtensionStatus, ExtensionType } from '../../types/agent.js'
import { ApiConfig, ChatRequest, ChatResponse, StatusResponse, MemoryQueryResponse, ActionRequest, ActionResponse } from './types.js'
import { AgentEvent, EventSource, EventType } from '../../types/agent.js'
import { BaseConfig } from '../../types/common.js'
import { initializeSkills } from './skills/index.js'
// @ts-ignore
import cors from 'cors'
// @ts-ignore
import rateLimit from 'express-rate-limit'

/**
 * HTTP API Extension for SYMindX
 * 
 * This extension provides a REST API for interacting with the agent.
 */
export class ApiExtension implements Extension {
  id = 'api'
  name = 'HTTP API'
  version = '1.0.0'
  enabled = true
  status = ExtensionStatus.DISABLED
  type = ExtensionType.COMMUNICATION
  dependencies = []
  capabilities = ['http_api', 'websocket']
  actions = {}
  events = {}
  config: ApiConfig
  
  private app: Express
  private server?: any
  private httpServer?: any
  private wss?: WebSocketServer
  private agent?: Agent
  private startTime: Date = new Date()
  private sessionStore: Map<string, any> = new Map()
  private wsClients: Set<WebSocket> = new Set()
  private skills: Record<string, any> = {}

  constructor(config: ApiConfig) {
    // Set default configuration with defaults first, then override with provided config
    const defaultConfig: ApiConfig = {
      settings: {} as BaseConfig,
      port: 3000,
      host: '0.0.0.0',
      cors: {
        enabled: true,
        origins: ['*'],
        credentials: false
      },
      auth: {
        enabled: false,
        type: 'bearer',
        secret: '',
        apiKeys: []
      },
      rateLimit: {
        enabled: true,
        windowMs: 60000, // 1 minute
        maxRequests: 60  // 60 requests per minute
      },
      endpoints: {
        chat: true,
        status: true,
        memory: true,
        actions: true,
        health: true
      },
      enabled: true
    };
    
    this.config = { ...defaultConfig, ...config };
    
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  async init(agent: Agent): Promise<void> {
    if (!this.config.enabled) {
      console.log('🌐 API Extension disabled')
      return
    }

    this.agent = agent
    console.log('🌐 Initializing API Extension...')

    // Initialize skills
    this.skills = initializeSkills(this)
    console.log('🎯 API Skills initialized:', Object.keys(this.skills))

    try {
      // Create HTTP server
      this.httpServer = http.createServer(this.app)
      
      // Start the HTTP server
      this.server = this.httpServer.listen(this.config.port, this.config.host, () => {
        console.log(`✅ API Server running on http://${this.config.host}:${this.config.port}`)
        console.log('📋 Available endpoints:')
        if (this.config.endpoints.health) console.log(`   GET  /health - Health check`)
        if (this.config.endpoints.status) console.log(`   GET  /status - Agent status`)
        if (this.config.endpoints.chat) console.log(`   POST /chat - Chat with agent`)
        if (this.config.endpoints.memory) console.log(`   POST /memory/query - Query memory`)
        if (this.config.endpoints.actions) console.log(`   POST /actions/execute - Execute actions`)
      })
      
      // Setup WebSocket server
      this.setupWebSocket()

      console.log('✅ API Extension initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize API Extension:', error)
      throw error
    }
  }

  async tick(agent: Agent): Promise<void> {
    // Send periodic updates to WebSocket clients
    if (this.wsClients.size > 0) {
      const status = {
        type: 'agent_update',
        data: {
          id: agent.id,
          name: agent.name,
          status: agent.status,
          lastUpdate: agent.lastUpdate.toISOString(),
          emotion: agent.emotion?.getCurrentEmotion?.() || 'neutral',
          memoryCount: agent.memory ? await this.getMemoryCount(agent) : 0,
          uptime: Date.now() - this.startTime.getTime()
        },
        timestamp: new Date().toISOString()
      }
      
      this.broadcastToClients(status)
    }
  }
  
  private async getMemoryCount(agent: Agent): Promise<number> {
    try {
      const recent = await agent.memory?.getRecent?.(1000) || []
      return recent.length
    } catch {
      return 0
    }
  }
  
  private setupWebSocket(): void {
    if (!this.httpServer) return
    
    this.wss = new WebSocketServer({ 
      server: this.httpServer,
      path: '/ws'
    })
    
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log(`🔌 WebSocket client connected from ${req.socket.remoteAddress}`)
      this.wsClients.add(ws)
      
      // Send initial agent status
      if (this.agent) {
        const initialStatus = {
          type: 'connection_established',
          data: {
            id: this.agent.id,
            name: this.agent.name,
            status: this.agent.status,
            extensions: this.agent.extensions.map(ext => ({
              id: ext.id,
              name: ext.name,
              enabled: ext.enabled
            }))
          },
          timestamp: new Date().toISOString()
        }
        
        ws.send(JSON.stringify(initialStatus))
      }
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleWebSocketMessage(ws, message)
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error)
        }
      })
      
      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected')
        this.wsClients.delete(ws)
      })
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error)
        this.wsClients.delete(ws)
      })
    })
    
    console.log(`🔌 WebSocket server listening on ws://${this.config.host}:${this.config.port}/ws`)
  }
  
  private handleWebSocketMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
        break
      case 'get_status':
        if (this.agent) {
          const status = {
            type: 'agent_status',
            data: {
              id: this.agent.id,
              name: this.agent.name,
              status: this.agent.status,
              lastUpdate: this.agent.lastUpdate.toISOString(),
              emotion: this.agent.emotion?.getCurrentEmotion?.() || 'neutral',
              uptime: Date.now() - this.startTime.getTime()
            },
            timestamp: new Date().toISOString()
          }
          ws.send(JSON.stringify(status))
        }
        break
      default:
        console.warn(`⚠️ Unknown WebSocket message type: ${message.type}`)
    }
  }
  
  private broadcastToClients(message: any): void {
    const messageStr = JSON.stringify(message)
    this.wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr)
      }
    })
  }

  private setupMiddleware(): void {
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true }))

    // CORS
    if (this.config.cors?.enabled) {
      this.app.use(cors({
        origin: this.config.cors.origins,
        credentials: this.config.cors.credentials
      }))
    }

    // Rate limiting
    if (this.config.rateLimit?.enabled) {
      const limiter = rateLimit({
        windowMs: this.config.rateLimit.windowMs,
        max: this.config.rateLimit.maxRequests,
        message: {
          success: false,
          error: 'Too many requests, please try again later'
        }
      })
      this.app.use(limiter)
    }

    // Authentication middleware
    if (this.config.auth?.enabled) {
      this.app.use(this.authMiddleware.bind(this))
    }

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path} - ${req.ip}`)
      next()
    })
  }

  private authMiddleware(req: Request, res: Response, next: Function): void {
    // Skip auth for health endpoint
    if (req.path === '/health') {
      return next()
    }

    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required'
      })
    }

    if (this.config.auth?.type === 'bearer') {
      const token = authHeader.replace('Bearer ', '')
      if (token !== this.config.auth.secret) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        })
      }
    } else if (this.config.auth?.type === 'apikey') {
      const apiKey = authHeader.replace('ApiKey ', '')
      if (!this.config.auth.apiKeys?.includes(apiKey)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key'
        })
      }
    }

    next()
  }

  private setupRoutes(): void {
    // Health check endpoint
    if (this.config.endpoints.health) {
      this.app.get('/health', this.handleHealth.bind(this))
    }

    // Agent status endpoint
    if (this.config.endpoints.status) {
      this.app.get('/status', this.handleStatus.bind(this))
    }

    // Chat endpoint
    if (this.config.endpoints.chat) {
      this.app.post('/chat', this.handleChat.bind(this))
      this.app.post('/chat/stream', this.handleChatStream.bind(this))
    }

    // Memory endpoints
    if (this.config.endpoints.memory) {
      this.app.post('/memory/query', this.handleMemoryQuery.bind(this))
      this.app.get('/memory/recent', this.handleMemoryRecent.bind(this))
    }

    // Action execution endpoint
    if (this.config.endpoints.actions) {
      this.app.post('/actions/execute', this.handleActionExecute.bind(this))
      this.app.get('/actions/list', this.handleActionsList.bind(this))
    }

    // Error handler
    this.app.use((error: any, req: Request, res: Response, next: Function) => {
      console.error('❌ API Error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    })
  }

  private async handleHealth(req: Request, res: Response): Promise<void> {
    const uptime = Date.now() - this.startTime.getTime()
    
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      version: this.version,
      checks: {
        agent: !!this.agent,
        memory: !!this.agent?.memory,
        portal: !!this.agent?.portal,
        extensions: this.agent?.extensions?.length > 0
      }
    }

    // Determine overall health status
    const failedChecks = Object.values(health.checks).filter(check => !check).length
    if (failedChecks > 0) {
      health.status = failedChecks > 2 ? 'unhealthy' : 'degraded'
    }

    res.json(health)
  }

  private async handleStatus(req: Request, res: Response): Promise<void> {
    if (!this.agent) {
      return res.status(503).json({
        success: false,
        error: 'Agent not available'
      })
    }

    const uptime = Date.now() - this.startTime.getTime()
    
    const status: StatusResponse = {
      success: true,
      agent: {
        id: this.agent.id,
        name: this.agent.name,
        status: this.agent.status,
        lastUpdate: this.agent.lastUpdate.toISOString(),
        uptime
      },
      extensions: this.agent.extensions.map(ext => ({
        id: ext.id,
        name: ext.name,
        enabled: ext.enabled,
        version: ext.version
      }))
    }

    // Add memory info if available
    if (this.agent.memory) {
      try {
        const recentMemories = await this.agent.memory.getRecent?.(10) || []
        status.memory = {
          totalRecords: recentMemories.length,
          recentActivity: recentMemories.filter(m => 
            new Date(m.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
          ).length
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch memory info:', error)
      }
    }

    // Add emotion info if available
    if (this.agent.emotion) {
      try {
        status.emotion = {
          current: this.agent.emotion.getCurrentEmotion?.() || 'neutral',
          intensity: this.agent.emotion.getIntensity?.() || 0.5
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch emotion info:', error)
      }
    }

    res.json(status)
  }

  private async handleChat(req: Request, res: Response): Promise<void> {
    if (!this.agent?.portal) {
      return res.status(503).json({
        success: false,
        error: 'Agent portal not available'
      })
    }

    const startTime = Date.now()
    const chatRequest: ChatRequest = req.body

    if (!chatRequest.message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      })
    }

    try {
      // Generate session ID if not provided
      const sessionId = chatRequest.context?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Store memory context if enabled
      if (chatRequest.options?.includeMemory && this.agent.memory) {
        await this.agent.memory.store?.({
          id: `msg_${Date.now()}`,
          content: chatRequest.message,
          type: 'user_message',
          timestamp: new Date(),
          importance: 0.7,
          metadata: {
            sessionId,
            userId: chatRequest.context?.userId
          }
        })
      }

      // Prepare chat messages
      const messages = [
        {
          role: 'user' as const,
          content: chatRequest.message
        }
      ]

      // Generate response
      const response = await this.agent.portal.generateChat(messages, {
        maxTokens: chatRequest.options?.maxTokens,
        temperature: chatRequest.options?.temperature
      })

      // Store agent response in memory if enabled
      if (chatRequest.options?.includeMemory && this.agent.memory) {
        await this.agent.memory.store?.({
          id: `msg_${Date.now()}_response`,
          content: response.content,
          type: 'agent_response',
          timestamp: new Date(),
          importance: 0.8,
          metadata: {
            sessionId,
            userId: chatRequest.context?.userId,
            tokensUsed: response.usage?.totalTokens
          }
        })
      }

      const processingTime = Date.now() - startTime

      const chatResponse: ChatResponse = {
        success: true,
        response: response.content,
        sessionId,
        timestamp: new Date().toISOString(),
        metadata: {
          tokensUsed: response.usage?.totalTokens,
          processingTime,
          memoryUpdated: !!chatRequest.options?.includeMemory
        }
      }

      // Add emotion if available
      if (this.agent.emotion) {
        chatResponse.metadata!.emotion = this.agent.emotion.getCurrentEmotion?.()
      }

      res.json(chatResponse)
    } catch (error) {
      console.error('❌ Chat error:', error)
      res.status(500).json({
        success: false,
        error: `Chat failed: ${error}`,
        timestamp: new Date().toISOString()
      })
    }
  }

  private async handleChatStream(req: Request, res: Response): Promise<void> {
    if (!this.agent?.portal?.streamChat) {
      return res.status(503).json({
        success: false,
        error: 'Streaming not supported by current portal'
      })
    }

    const chatRequest: ChatRequest = req.body

    if (!chatRequest.message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      })
    }

    try {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const messages = [
        {
          role: 'user' as const,
          content: chatRequest.message
        }
      ]

      const stream = this.agent.portal.streamChat(messages, {
        maxTokens: chatRequest.options?.maxTokens,
        temperature: chatRequest.options?.temperature
      })

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
      res.end()
    } catch (error) {
      console.error('❌ Stream chat error:', error)
      res.write(`data: ${JSON.stringify({ error: `Stream failed: ${error}` })}\n\n`)
      res.end()
    }
  }

  private async handleMemoryQuery(req: Request, res: Response): Promise<void> {
    if (!this.agent?.memory) {
      return res.status(503).json({
        success: false,
        error: 'Memory not available'
      })
    }

    const queryRequest: any = req.body

    if (!queryRequest.query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      })
    }

    try {
      const memories = await this.agent.memory.search?.(queryRequest.query, queryRequest.limit || 10) || []
      
      const response: MemoryQueryResponse = {
        success: true,
        memories: memories.map(memory => ({
          id: memory.id,
          content: memory.content,
          type: memory.type,
          timestamp: memory.timestamp.toISOString(),
          importance: memory.importance,
          metadata: memory.metadata
        })),
        total: memories.length
      }

      res.json(response)
    } catch (error) {
      console.error('❌ Memory query error:', error)
      res.status(500).json({
        success: false,
        error: `Memory query failed: ${error}`
      })
    }
  }

  private async handleMemoryRecent(req: Request, res: Response): Promise<void> {
    if (!this.agent?.memory) {
      return res.status(503).json({
        success: false,
        error: 'Memory not available'
      })
    }

    try {
      const limit = parseInt(req.query.limit as string) || 10
      const memories = await this.agent.memory.getRecent?.(limit) || []
      
      const response: MemoryQueryResponse = {
        success: true,
        memories: memories.map(memory => ({
          id: memory.id,
          content: memory.content,
          type: memory.type,
          timestamp: memory.timestamp.toISOString(),
          importance: memory.importance,
          metadata: memory.metadata
        })),
        total: memories.length
      }

      res.json(response)
    } catch (error) {
      console.error('❌ Memory recent error:', error)
      res.status(500).json({
        success: false,
        error: `Memory fetch failed: ${error}`
      })
    }
  }

  private async handleActionExecute(req: Request, res: Response): Promise<void> {
    if (!this.agent) {
      return res.status(503).json({
        success: false,
        error: 'Agent not available'
      })
    }

    const actionRequest: ActionRequest = req.body

    if (!actionRequest.extension || !actionRequest.action) {
      return res.status(400).json({
        success: false,
        error: 'Extension and action are required'
      })
    }

    try {
      const extension = this.agent.extensions.find(ext => ext.id === actionRequest.extension)
      if (!extension) {
        return res.status(404).json({
          success: false,
          error: `Extension not found: ${actionRequest.extension}`
        })
      }

      const actionHandler = extension.actions[actionRequest.action]
      if (!actionHandler) {
        return res.status(404).json({
          success: false,
          error: `Action not found: ${actionRequest.action}`
        })
      }

      const result = await actionHandler.execute(this.agent, actionRequest.parameters || {})
      
      const response: ActionResponse = {
        success: result.success,
        result: result.result,
        error: result.error,
        metadata: result.metadata
      }

      res.json(response)
    } catch (error) {
      console.error('❌ Action execution error:', error)
      res.status(500).json({
        success: false,
        error: `Action execution failed: ${error}`
      })
    }
  }

  private async handleActionsList(req: Request, res: Response): Promise<void> {
    if (!this.agent) {
      return res.status(503).json({
        success: false,
        error: 'Agent not available'
      })
    }

    try {
      const actions = this.agent.extensions.reduce((acc, extension) => {
        acc[extension.id] = Object.keys(extension.actions).map(actionName => ({
          name: actionName,
          description: extension.actions[actionName].description,
          parameters: extension.actions[actionName].parameters
        }))
        return acc
      }, {} as Record<string, any[]>)

      res.json({
        success: true,
        actions
      })
    } catch (error) {
      console.error('❌ Actions list error:', error)
      res.status(500).json({
        success: false,
        error: `Failed to list actions: ${error}`
      })
    }
  }

  get actions(): Record<string, any> {
    // Collect actions from all skills
    const skillActions: Record<string, any> = {}
    
    Object.values(this.skills).forEach(skill => {
      if (skill && typeof skill.getActions === 'function') {
        const actions = skill.getActions()
        Object.assign(skillActions, actions)
      }
    })

    // Add legacy actions for backward compatibility
    const legacyActions = {
      getApiStatus: {
        name: 'getApiStatus',
        description: 'Get API server status',
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<any> => {
          return {
            success: true,
            result: {
              enabled: this.config.enabled,
              running: !!this.server,
              port: this.config.port,
              host: this.config.host,
              endpoints: this.config.endpoints,
              uptime: Date.now() - this.startTime.getTime()
            }
          }
        }
      },
      restartApiServer: {
        name: 'restartApiServer',
        description: 'Restart the API server',
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<any> => {
          try {
            if (this.server) {
              this.server.close()
            }
            
            this.server = this.app.listen(this.config.port, this.config.host)
            
            return { success: true, result: 'API server restarted' }
          } catch (error) {
            return { success: false, error: `Failed to restart API server: ${error}` }
          }
        }
      }
    }

    return { ...skillActions, ...legacyActions }
  }

  get events(): Record<string, any> {
    return {
      apiServerStarted: {
        event: 'api.server.started',
        description: 'Triggered when API server starts',
        handler: async (agent: Agent, event: any) => {
          console.log('🌐 API Server started event received')
        }
      },
      apiRequestReceived: {
        event: 'api.request.received',
        description: 'Triggered when API request is received',
        handler: async (agent: Agent, event: any) => {
          console.log(`📡 API Request: ${event.data.method} ${event.data.path}`)
        }
      }
    }
  }

  async shutdown(): Promise<void> {
    if (this.wss) {
      console.log('🔌 Shutting down WebSocket server...')
      this.wss.close()
      this.wss = undefined
    }
    
    if (this.server) {
      console.log('🌐 Shutting down API server...')
      this.server.close()
      this.server = undefined
    }
    
    if (this.httpServer) {
      this.httpServer = undefined
    }
    
    this.wsClients.clear()
  }

  // Getter methods for skills to access extension properties
  getApp(): Express {
    return this.app
  }

  getServer(): any {
    return this.server
  }

  getWebSocketServer(): WebSocketServer | null {
    return this.wss || null
  }

  getSessionStore(): Map<string, any> {
    return this.sessionStore
  }

  getWebSocketClients(): Set<WebSocket> {
    return this.wsClients
  }

  broadcastMessage(message: any): void {
    this.broadcastToClients(message)
  }
}

export default ApiExtension