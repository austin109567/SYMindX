/**
 * Real-time Streaming Interface Module
 * 
 * This module provides real-time streaming capabilities for agent output,
 * interactive control, and progress tracking.
 */

import { EventEmitter } from 'events'
import {
  EventStream,
  StreamEvent,
  StreamListener,
  Subscription,
  ControlInterface,
  ProgressMonitor,
  Progress,
  ProgressListener
} from '../../extensions/mcp-client/types.js'
import { Agent, AgentStatus } from '../../types/agent.js'

export interface StreamingInterface {
  realTimeOutput: EventStream
  interactiveControl: ControlInterface
  progressTracking: ProgressMonitor
}

export interface StreamConfig {
  maxListeners: number
  bufferSize: number
  compressionEnabled: boolean
  rateLimitMs: number
  persistEvents: boolean
  eventRetentionMs: number
}

export interface ControlConfig {
  allowedOperations: string[]
  requireConfirmation: boolean
  timeoutMs: number
  maxConcurrentOperations: number
}

export interface ProgressConfig {
  trackingEnabled: boolean
  updateIntervalMs: number
  maxTrackedTasks: number
  persistProgress: boolean
}

export class SYMindXEventStream implements EventStream {
  private emitter = new EventEmitter()
  private listeners: Map<string, StreamListener> = new Map()
  private eventBuffer: StreamEvent[] = []
  private config: StreamConfig
  private lastEmitTime = 0

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = {
      maxListeners: 100,
      bufferSize: 1000,
      compressionEnabled: false,
      rateLimitMs: 10, // 100 events per second max
      persistEvents: true,
      eventRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    }

    this.emitter.setMaxListeners(this.config.maxListeners)
    
    // Clean up old events periodically
    if (this.config.persistEvents) {
      setInterval(() => this.cleanupOldEvents(), 60000) // Every minute
    }
  }

  subscribe(listener: StreamListener): Subscription {
    const listenerId = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.listeners.set(listenerId, listener)

    const eventHandler = (event: StreamEvent) => {
      try {
        listener.onEvent(event)
      } catch (error) {
        console.error('Error in stream listener:', error)
        if (listener.onError) {
          listener.onError(error instanceof Error ? error : new Error(String(error)))
        }
      }
    }

    const errorHandler = (error: Error) => {
      if (listener.onError) {
        listener.onError(error)
      }
    }

    const closeHandler = () => {
      if (listener.onClose) {
        listener.onClose()
      }
    }

    this.emitter.on('event', eventHandler)
    this.emitter.on('error', errorHandler)
    this.emitter.on('close', closeHandler)

    console.log(`📡 Stream listener ${listenerId} subscribed`)

    return {
      unsubscribe: () => {
        this.emitter.off('event', eventHandler)
        this.emitter.off('error', errorHandler)
        this.emitter.off('close', closeHandler)
        this.listeners.delete(listenerId)
        console.log(`📡 Stream listener ${listenerId} unsubscribed`)
      },
      isActive: () => this.listeners.has(listenerId)
    }
  }

  emit(event: StreamEvent): void {
    // Rate limiting
    const now = Date.now()
    if (now - this.lastEmitTime < this.config.rateLimitMs) {
      return
    }
    this.lastEmitTime = now

    // Add to buffer
    if (this.config.persistEvents) {
      this.eventBuffer.push(event)
      
      // Trim buffer if too large
      if (this.eventBuffer.length > this.config.bufferSize) {
        this.eventBuffer = this.eventBuffer.slice(-this.config.bufferSize)
      }
    }

    // Emit to listeners
    this.emitter.emit('event', event)
  }

  close(): void {
    this.emitter.emit('close')
    this.emitter.removeAllListeners()
    this.listeners.clear()
    this.eventBuffer = []
    console.log('📡 Event stream closed')
  }

  // Utility methods
  getRecentEvents(count = 50): StreamEvent[] {
    return this.eventBuffer.slice(-count)
  }

  getEventsByType(type: string, count = 50): StreamEvent[] {
    return this.eventBuffer
      .filter(event => event.type === type)
      .slice(-count)
  }

  getEventsBySource(source: string, count = 50): StreamEvent[] {
    return this.eventBuffer
      .filter(event => event.source === source)
      .slice(-count)
  }

  getEventsSince(timestamp: Date): StreamEvent[] {
    return this.eventBuffer.filter(event => event.timestamp >= timestamp)
  }

  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - this.config.eventRetentionMs)
    const originalLength = this.eventBuffer.length
    
    this.eventBuffer = this.eventBuffer.filter(event => event.timestamp >= cutoff)
    
    const removed = originalLength - this.eventBuffer.length
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old events from stream buffer`)
    }
  }
}

export class SYMindXControlInterface implements ControlInterface {
  private agents: Map<string, Agent> = new Map()
  private config: ControlConfig
  private activeOperations: Map<string, Promise<void>> = new Map()
  private operationQueue: Map<string, (() => Promise<void>)[]> = new Map()

  constructor(config: Partial<ControlConfig> = {}) {
    this.config = {
      allowedOperations: ['pause', 'resume', 'stop', 'restart', 'configure'],
      requireConfirmation: false,
      timeoutMs: 30000,
      maxConcurrentOperations: 5,
      ...config
    }
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent)
    console.log(`🎮 Agent ${agent.id} registered for control`)
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId)
    this.activeOperations.delete(agentId)
    this.operationQueue.delete(agentId)
    console.log(`🎮 Agent ${agentId} unregistered from control`)
  }

  async pause(agentId: string): Promise<void> {
    await this.executeOperation(agentId, 'pause', async () => {
      const agent = this.agents.get(agentId)
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`)
      }

      if (agent.status === 'idle') {
        console.log(`⏸️ Agent ${agentId} is already paused/idle`)
        return
      }

      // Set agent status to idle (paused)
      agent.status = AgentStatus.IDLE
      agent.lastUpdate = new Date()
      
      console.log(`⏸️ Agent ${agentId} paused`)
      
      // Emit pause event
      if (agent.eventBus) {
        agent.eventBus.emit({
          id: `control-pause-${Date.now()}`,
          type: 'agent.paused',
          source: 'control',
          data: { agentId },
          timestamp: new Date(),
          processed: false
        })
      }
    })
  }

  async resume(agentId: string): Promise<void> {
    await this.executeOperation(agentId, 'resume', async () => {
      const agent = this.agents.get(agentId)
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`)
      }

      if (agent.status === 'active') {
        console.log(`▶️ Agent ${agentId} is already active`)
        return
      }

      // Set agent status to active
      agent.status = AgentStatus.ACTIVE
      agent.lastUpdate = new Date()
      
      console.log(`▶️ Agent ${agentId} resumed`)
      
      // Emit resume event
      if (agent.eventBus) {
        agent.eventBus.emit({
          id: `control-resume-${Date.now()}`,
          type: 'agent.resumed',
          source: 'control',
          data: { agentId },
          timestamp: new Date(),
          processed: false
        })
      }
    })
  }

  async stop(agentId: string): Promise<void> {
    await this.executeOperation(agentId, 'stop', async () => {
      const agent = this.agents.get(agentId)
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`)
      }

      // Stop all extensions
      for (const extension of agent.extensions) {
        try {
          if (extension.lifecycle?.onUnload) {
            await extension.lifecycle.onUnload()
          }
        } catch (error) {
          console.warn(`Warning: Error stopping extension ${extension.id}:`, error)
        }
      }

      agent.status = AgentStatus.IDLE
      agent.lastUpdate = new Date()
      
      console.log(`⏹️ Agent ${agentId} stopped`)
      
      // Emit stop event
      if (agent.eventBus) {
        agent.eventBus.emit({
          id: `control-stop-${Date.now()}`,
          type: 'agent.stopped',
          source: 'control',
          data: { agentId },
          timestamp: new Date(),
          processed: false
        })
      }
    })
  }

  async restart(agentId: string): Promise<void> {
    await this.executeOperation(agentId, 'restart', async () => {
      const agent = this.agents.get(agentId)
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`)
      }

      console.log(`🔄 Restarting agent ${agentId}...`)
      
      // Stop first
      await this.stop(agentId)
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Restart extensions
      for (const extension of agent.extensions) {
        try {
          if (extension.lifecycle?.onReload) {
            await extension.lifecycle.onReload()
          } else {
            await extension.init(agent)
          }
        } catch (error) {
          console.warn(`Warning: Error restarting extension ${extension.id}:`, error)
        }
      }

      agent.status = AgentStatus.ACTIVE
      agent.lastUpdate = new Date()
      
      console.log(`🔄 Agent ${agentId} restarted`)
      
      // Emit restart event
      if (agent.eventBus) {
        agent.eventBus.emit({
          id: `control-restart-${Date.now()}`,
          type: 'agent.restarted',
          source: 'control',
          data: { agentId },
          timestamp: new Date(),
          processed: false
        })
      }
    })
  }

  async configure(agentId: string, config: Partial<any>): Promise<void> {
    await this.executeOperation(agentId, 'configure', async () => {
      const agent = this.agents.get(agentId)
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`)
      }

      // Update agent config
      agent.config = { ...agent.config, ...config }
      agent.lastUpdate = new Date()
      
      console.log(`⚙️ Agent ${agentId} configuration updated`)
      
      // Emit configure event
      if (agent.eventBus) {
        agent.eventBus.emit({
          id: `control-configure-${Date.now()}`,
          type: 'agent.configured',
          source: 'control',
          data: { agentId, config },
          timestamp: new Date(),
          processed: false
        })
      }
    })
  }

  private async executeOperation(agentId: string, operation: string, fn: () => Promise<void>): Promise<void> {
    if (!this.config.allowedOperations.includes(operation)) {
      throw new Error(`Operation ${operation} not allowed`)
    }

    // Check if too many concurrent operations
    if (this.activeOperations.size >= this.config.maxConcurrentOperations) {
      // Queue the operation
      const queue = this.operationQueue.get(agentId) || []
      queue.push(fn)
      this.operationQueue.set(agentId, queue)
      
      console.log(`⏳ Operation ${operation} for agent ${agentId} queued`)
      return
    }

    const operationKey = `${agentId}:${operation}`
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation ${operation} for agent ${agentId} timed out`))
      }, this.config.timeoutMs)
    })

    // Execute operation with timeout
    const operationPromise = Promise.race([fn(), timeoutPromise])
    this.activeOperations.set(operationKey, operationPromise)

    try {
      await operationPromise
    } finally {
      this.activeOperations.delete(operationKey)
      
      // Process queued operations
      const queue = this.operationQueue.get(agentId)
      if (queue && queue.length > 0) {
        const nextOperation = queue.shift()!
        this.operationQueue.set(agentId, queue)
        
        // Execute next operation (don't await to avoid blocking)
        this.executeOperation(agentId, 'queued', nextOperation).catch(error => {
          console.error(`Error executing queued operation for ${agentId}:`, error)
        })
      }
    }
  }

  getActiveOperations(): string[] {
    return Array.from(this.activeOperations.keys())
  }

  getQueuedOperations(agentId: string): number {
    return this.operationQueue.get(agentId)?.length || 0
  }
}

export class SYMindXProgressMonitor implements ProgressMonitor {
  private progressMap: Map<string, Progress> = new Map()
  private listeners: Map<string, Map<string, ProgressListener[]>> = new Map()
  private config: ProgressConfig
  private updateTimer?: NodeJS.Timeout

  constructor(config: Partial<ProgressConfig> = {}) {
    this.config = {
      trackingEnabled: true,
      updateIntervalMs: 1000,
      maxTrackedTasks: 1000,
      persistProgress: true,
      ...config
    }

    if (this.config.trackingEnabled) {
      this.startUpdateTimer()
    }
  }

  track(taskId: string, progress: Progress): void {
    if (!this.config.trackingEnabled) return

    // Limit number of tracked tasks
    if (this.progressMap.size >= this.config.maxTrackedTasks && !this.progressMap.has(taskId)) {
      // Remove oldest task
      const oldestTaskId = this.progressMap.keys().next().value
      if (oldestTaskId) {
        this.progressMap.delete(oldestTaskId)
        this.listeners.delete(oldestTaskId)
      }
    }

    this.progressMap.set(taskId, progress)
    
    // Notify listeners
    const taskListeners = this.listeners.get(taskId)
    if (taskListeners) {
      for (const listeners of Array.from(taskListeners.values())) {
        for (const listener of listeners) {
          try {
            listener(progress)
          } catch (error) {
            console.error(`Error in progress listener for task ${taskId}:`, error)
          }
        }
      }
    }

    console.log(`📊 Progress updated for task ${taskId}: ${progress.percentage}% - ${progress.stage}`)
  }

  getProgress(taskId: string): Progress | undefined {
    return this.progressMap.get(taskId)
  }

  subscribe(taskId: string, listener: ProgressListener): Subscription {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Map())
    }
    
    const taskListeners = this.listeners.get(taskId)!
    const listenerId = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    if (!taskListeners.has(listenerId)) {
      taskListeners.set(listenerId, [])
    }
    
    taskListeners.get(listenerId)!.push(listener)
    
    console.log(`📊 Progress listener ${listenerId} subscribed to task ${taskId}`)

    return {
      unsubscribe: () => {
        const taskListeners = this.listeners.get(taskId)
        if (taskListeners) {
          taskListeners.delete(listenerId)
          if (taskListeners.size === 0) {
            this.listeners.delete(taskId)
          }
        }
        console.log(`📊 Progress listener ${listenerId} unsubscribed from task ${taskId}`)
      },
      isActive: () => {
        const taskListeners = this.listeners.get(taskId)
        return taskListeners ? taskListeners.has(listenerId) : false
      }
    }
  }

  // Utility methods
  getAllProgress(): Map<string, Progress> {
    return new Map(this.progressMap)
  }

  getActiveTaskIds(): string[] {
    return Array.from(this.progressMap.keys()).filter(taskId => {
      const progress = this.progressMap.get(taskId)
      return progress && progress.percentage < 100
    })
  }

  getCompletedTaskIds(): string[] {
    return Array.from(this.progressMap.keys()).filter(taskId => {
      const progress = this.progressMap.get(taskId)
      return progress && progress.percentage >= 100
    })
  }

  clearCompleted(): void {
    const completedTasks = this.getCompletedTaskIds()
    for (const taskId of completedTasks) {
      this.progressMap.delete(taskId)
      this.listeners.delete(taskId)
    }
    console.log(`📊 Cleared ${completedTasks.length} completed tasks from progress monitor`)
  }

  private startUpdateTimer(): void {
    this.updateTimer = setInterval(() => {
      // Update estimated completion times
      for (const [taskId, progress] of Array.from(this.progressMap.entries())) {
        if (progress.percentage > 0 && progress.percentage < 100) {
          // Simple linear estimation
          const elapsed = Date.now() - (progress.estimatedCompletion?.getTime() || Date.now())
          const rate = progress.percentage / elapsed
          const remaining = (100 - progress.percentage) / rate
          
          progress.estimatedCompletion = new Date(Date.now() + remaining)
        }
      }
    }, this.config.updateIntervalMs)
  }

  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = undefined
    }
    
    this.progressMap.clear()
    this.listeners.clear()
    console.log('📊 Progress monitor destroyed')
  }
}

// Factory function to create streaming interface
export function createStreamingInterface(
  streamConfig?: Partial<StreamConfig>,
  controlConfig?: Partial<ControlConfig>,
  progressConfig?: Partial<ProgressConfig>
): StreamingInterface {
  return {
    realTimeOutput: new SYMindXEventStream(streamConfig),
    interactiveControl: new SYMindXControlInterface(controlConfig),
    progressTracking: new SYMindXProgressMonitor(progressConfig)
  }
}