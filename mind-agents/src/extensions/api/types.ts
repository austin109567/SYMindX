/**
 * API Extension Types
 * 
 * This file defines the types for the HTTP API extension.
 */

import { Request, Response } from 'express'
import { Agent } from '../../types/agent.js'
import { BaseConfig } from '../../types/common.js'

export interface ApiConfig {
  enabled: boolean
  port: number
  host?: string
  cors?: {
    enabled: boolean
    origins?: string[]
    credentials?: boolean
  }
  auth?: {
    enabled: boolean
    type: 'bearer' | 'apikey'
    secret?: string
    apiKeys?: string[]
  }
  rateLimit?: {
    enabled: boolean
    windowMs: number
    maxRequests: number
  }
  endpoints: {
    chat: boolean
    status: boolean
    memory: boolean
    actions: boolean
    health: boolean
  }
  settings: BaseConfig
}

export interface ChatRequest {
  message: string
  context?: {
    sessionId?: string
    userId?: string
    metadata?: Record<string, any>
  }
  options?: {
    stream?: boolean
    includeMemory?: boolean
    maxTokens?: number
    temperature?: number
  }
}

export interface ChatResponse {
  success: boolean
  response?: string
  sessionId?: string
  timestamp: string
  metadata?: {
    tokensUsed?: number
    processingTime?: number
    emotion?: string
    memoryUpdated?: boolean
  }
  error?: string
}

export interface StatusResponse {
  success: boolean
  agent: {
    id: string
    name: string
    status: string
    lastUpdate: string
    uptime: number
  }
  extensions: Array<{
    id: string
    name: string
    enabled: boolean
    version: string
  }>
  memory?: {
    totalRecords: number
    recentActivity: number
  }
  emotion?: {
    current: string
    intensity: number
  }
}

export interface MemoryQueryRequest {
  query: string
  limit?: number
  type?: string
  dateRange?: {
    start: string
    end: string
  }
}

export interface MemoryQueryResponse {
  success: boolean
  memories: Array<{
    id: string
    content: string
    type: string
    timestamp: string
    importance: number
    metadata?: Record<string, any>
  }>
  total: number
  error?: string
}

export interface ActionRequest {
  extension: string
  action: string
  parameters?: Record<string, any>
}

export interface ActionResponse {
  success: boolean
  result?: any
  error?: string
  metadata?: Record<string, any>
}

export interface ApiMiddleware {
  (req: Request, res: Response, next: Function): void | Promise<void>
}

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  handler: (req: Request, res: Response, agent: Agent) => Promise<void>
  middleware?: ApiMiddleware[]
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  checks: {
    agent: boolean
    memory: boolean
    portal: boolean
    extensions: boolean
  }
}