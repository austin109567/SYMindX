/**
 * Enhanced Event Bus
 * 
 * This module provides an enhanced event-driven architecture with
 * publish/subscribe, event replay, and persistence capabilities.
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import { join } from 'path'
import { AgentEvent } from '../types/agent.js'
import { GenericData } from '../types/common.js'

export interface EnhancedEventBus {
  publish(event: AgentEvent): Promise<void>
  subscribe(pattern: EventPattern, handler: EventHandler): Subscription
  replay(fromTimestamp: Date): EventStream
  persistence: EventStore
}

export interface EventPattern {
  type?: string | RegExp
  source?: string | RegExp
  data?: GenericData
  tags?: string[]
}

export interface EventHandler {
  (event: AgentEvent): Promise<void> | void
}

export interface Subscription {
  id: string
  pattern: EventPattern
  handler: EventHandler
  unsubscribe(): void
  isActive(): boolean
  getStats(): SubscriptionStats
}

export interface SubscriptionStats {
  eventsProcessed: number
  lastEventTime?: Date
  errors: number
  averageProcessingTime: number
}

export interface EventStream {
  events: AsyncIterable<AgentEvent>
  filter(predicate: (event: AgentEvent) => boolean): EventStream
  map<T>(mapper: (event: AgentEvent) => T): AsyncIterable<T>
  take(count: number): EventStream
  skip(count: number): EventStream
  close(): void
}

export interface EventStore {
  save(event: AgentEvent): Promise<void>
  load(query: EventQuery): Promise<AgentEvent[]>
  delete(query: EventQuery): Promise<number>
  compact(): Promise<void>
  getStats(): Promise<EventStoreStats>
}

export interface EventQuery {
  fromTimestamp?: Date
  toTimestamp?: Date
  types?: string[]
  sources?: string[]
  limit?: number
  offset?: number
  orderBy?: 'timestamp' | 'type' | 'source'
  orderDirection?: 'asc' | 'desc'
}

export interface EventStoreStats {
  totalEvents: number
  oldestEvent?: Date
  newestEvent?: Date
  eventsByType: Record<string, number>
  eventsBySource: Record<string, number>
  storageSize: number
}

export interface EventBusConfig {
  persistence: {
    enabled: boolean
    storePath: string
    maxFileSize: number
    compressionEnabled: boolean
    retentionDays: number
  }
  performance: {
    maxSubscribers: number
    eventBufferSize: number
    batchSize: number
    flushIntervalMs: number
  }
  monitoring: {
    metricsEnabled: boolean
    slowEventThresholdMs: number
    errorRetryAttempts: number
  }
}

// Implementation
export class SYMindXEnhancedEventBus extends EventEmitter implements EnhancedEventBus {
  public persistence: EventStore
  private subscriptions: Map<string, EnhancedSubscription> = new Map()
  private config: EventBusConfig
  private eventBuffer: AgentEvent[] = []
  private flushTimer?: NodeJS.Timeout
  private metrics: EventBusMetrics

  constructor(config: Partial<EventBusConfig> = {}) {
    super()
    
    this.config = {
      persistence: {
        enabled: true,
        storePath: './data/events',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        compressionEnabled: true,
        retentionDays: 30
      },
      performance: {
        maxSubscribers: 1000,
        eventBufferSize: 10000,
        batchSize: 100,
        flushIntervalMs: 5000
      },
      monitoring: {
        metricsEnabled: true,
        slowEventThresholdMs: 1000,
        errorRetryAttempts: 3
      },
      ...config
    }

    this.persistence = new FileEventStore(this.config.persistence)
    this.metrics = new EventBusMetrics(this.config.monitoring)
    
    this.setMaxListeners(this.config.performance.maxSubscribers)
    
    if (this.config.persistence.enabled) {
      this.startPeriodicFlush()
    }
    
    console.log('🚌 Enhanced Event Bus initialized')
  }

  async publish(event: AgentEvent): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Add to buffer for persistence
      if (this.config.persistence.enabled) {
        this.eventBuffer.push(event)
        
        // Flush if buffer is full
        if (this.eventBuffer.length >= this.config.performance.eventBufferSize) {
          await this.flushEvents()
        }
      }
      
      // Notify subscribers
      const matchingSubscriptions = this.findMatchingSubscriptions(event)
      const promises = matchingSubscriptions.map(sub => this.notifySubscription(sub, event))
      
      await Promise.allSettled(promises)
      
      // Update metrics
      if (this.config.monitoring.metricsEnabled) {
        const duration = Date.now() - startTime
        this.metrics.recordEvent(event, duration, matchingSubscriptions.length)
      }
      
      console.log(`📤 Published event ${event.type} from ${event.source} to ${matchingSubscriptions.length} subscribers`)
      
    } catch (error) {
      console.error('❌ Error publishing event:', error)
      if (this.config.monitoring.metricsEnabled) {
        this.metrics.recordError('publish', error)
      }
      throw error
    }
  }

  subscribe(pattern: EventPattern, handler: EventHandler): Subscription {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const subscription = new EnhancedSubscription(
      subscriptionId,
      pattern,
      handler,
      this.config.monitoring
    )
    
    this.subscriptions.set(subscriptionId, subscription)
    
    console.log(`📥 Created subscription ${subscriptionId} for pattern:`, pattern)
    
    return {
      id: subscriptionId,
      pattern,
      handler,
      unsubscribe: () => {
        this.subscriptions.delete(subscriptionId)
        console.log(`📥 Unsubscribed ${subscriptionId}`)
      },
      isActive: () => this.subscriptions.has(subscriptionId),
      getStats: () => subscription.getStats()
    }
  }

  replay(fromTimestamp: Date): EventStream {
    return new ReplayEventStream(this.persistence, fromTimestamp)
  }

  getEvents(): AgentEvent[] {
    return [...this.eventBuffer]
  }

  private findMatchingSubscriptions(event: AgentEvent): EnhancedSubscription[] {
    const matching: EnhancedSubscription[] = []
    
    for (const subscription of this.subscriptions.values()) {
      if (this.matchesPattern(event, subscription.pattern)) {
        matching.push(subscription)
      }
    }
    
    return matching
  }

  private matchesPattern(event: AgentEvent, pattern: EventPattern): boolean {
    // Type matching
    if (pattern.type) {
      if (pattern.type instanceof RegExp) {
        if (!pattern.type.test(event.type)) return false
      } else {
        if (event.type !== pattern.type) return false
      }
    }
    
    // Source matching
    if (pattern.source) {
      if (pattern.source instanceof RegExp) {
        if (!pattern.source.test(event.source)) return false
      } else {
        if (event.source !== pattern.source) return false
      }
    }
    
    // Data matching
    if (pattern.data) {
      for (const [key, value] of Object.entries(pattern.data)) {
        if (!event.data || event.data[key] !== value) return false
      }
    }
    
    // Tags matching
    if (pattern.tags && event.tags) {
      for (const tag of pattern.tags) {
        if (!event.tags.includes(tag)) return false
      }
    }
    
    return true
  }

  private async notifySubscription(subscription: EnhancedSubscription, event: AgentEvent): Promise<void> {
    try {
      await subscription.handle(event)
    } catch (error) {
      console.error(`❌ Error in subscription ${subscription.id}:`, error)
      if (this.config.monitoring.metricsEnabled) {
        this.metrics.recordError('subscription', error)
      }
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return
    
    const events = [...this.eventBuffer]
    this.eventBuffer = []
    
    try {
      for (const event of events) {
        await this.persistence.save(event)
      }
      console.log(`💾 Flushed ${events.length} events to storage`)
    } catch (error) {
      console.error('❌ Error flushing events:', error)
      // Put events back in buffer for retry
      this.eventBuffer.unshift(...events)
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushEvents()
    }, this.config.performance.flushIntervalMs)
  }

  // Utility methods
  getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values()).map(sub => ({
      id: sub.id,
      pattern: sub.pattern,
      handler: sub.handler,
      unsubscribe: () => sub.unsubscribe(),
      isActive: () => sub.isActive(),
      getStats: () => sub.getStats()
    }))
  }

  getMetrics(): any {
    return this.config.monitoring.metricsEnabled ? this.metrics.getStats() : null
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    await this.flushEvents()
    this.subscriptions.clear()
    this.removeAllListeners()
    
    console.log('🚌 Enhanced Event Bus shut down')
  }
}

class EnhancedSubscription {
  public readonly id: string
  public readonly pattern: EventPattern
  public readonly handler: EventHandler
  private stats: SubscriptionStats
  private config: EventBusConfig['monitoring']
  private processingTimes: number[] = []

  constructor(
    id: string,
    pattern: EventPattern,
    handler: EventHandler,
    config: EventBusConfig['monitoring']
  ) {
    this.id = id
    this.pattern = pattern
    this.handler = handler
    this.config = config
    this.stats = {
      eventsProcessed: 0,
      errors: 0,
      averageProcessingTime: 0
    }
  }

  async handle(event: AgentEvent): Promise<void> {
    const startTime = Date.now()
    
    try {
      await this.handler(event)
      
      const processingTime = Date.now() - startTime
      this.updateStats(processingTime)
      
      if (processingTime > this.config.slowEventThresholdMs) {
        console.warn(`⚠️ Slow event processing in subscription ${this.id}: ${processingTime}ms`)
      }
      
    } catch (error) {
      this.stats.errors++
      throw error
    }
  }

  private updateStats(processingTime: number): void {
    this.stats.eventsProcessed++
    this.stats.lastEventTime = new Date()
    
    this.processingTimes.push(processingTime)
    
    // Keep only last 100 processing times for average calculation
    if (this.processingTimes.length > 100) {
      this.processingTimes = this.processingTimes.slice(-100)
    }
    
    this.stats.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
  }

  getStats(): SubscriptionStats {
    return { ...this.stats }
  }

  unsubscribe(): void {
    // Cleanup logic if needed
  }

  isActive(): boolean {
    return true // Could implement more sophisticated logic
  }
}

class FileEventStore implements EventStore {
  private config: EventBusConfig['persistence']
  private currentFile?: string
  private currentFileSize = 0

  constructor(config: EventBusConfig['persistence']) {
    this.config = config
    this.ensureStorageDirectory()
  }

  async save(event: AgentEvent): Promise<void> {
    if (!this.config.enabled) return
    
    const eventData = JSON.stringify(event) + '\n'
    const eventSize = Buffer.byteLength(eventData, 'utf8')
    
    // Check if we need a new file
    if (!this.currentFile || this.currentFileSize + eventSize > this.config.maxFileSize) {
      this.currentFile = this.generateFileName()
      this.currentFileSize = 0
    }
    
    const filePath = join(this.config.storePath, this.currentFile)
    
    try {
      await fs.appendFile(filePath, eventData)
      this.currentFileSize += eventSize
    } catch (error) {
      console.error('❌ Error saving event to storage:', error)
      throw error
    }
  }

  async load(query: EventQuery): Promise<AgentEvent[]> {
    const events: AgentEvent[] = []
    
    try {
      const files = await this.getEventFiles()
      
      for (const file of files) {
        const filePath = join(this.config.storePath, file)
        const content = await fs.readFile(filePath, 'utf8')
        const lines = content.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line) as AgentEvent
            
            if (this.matchesQuery(event, query)) {
              events.push(event)
            }
          } catch (error) {
            console.warn('⚠️ Invalid event data in storage:', line)
          }
        }
      }
      
      // Sort and limit results
      events.sort((a, b) => {
        const aTime = new Date(a.timestamp).getTime()
        const bTime = new Date(b.timestamp).getTime()
        return query.orderDirection === 'desc' ? bTime - aTime : aTime - bTime
      })
      
      if (query.offset) {
        events.splice(0, query.offset)
      }
      
      if (query.limit) {
        events.splice(query.limit)
      }
      
    } catch (error) {
      console.error('❌ Error loading events from storage:', error)
    }
    
    return events
  }

  async delete(query: EventQuery): Promise<number> {
    // For simplicity, this implementation doesn't support selective deletion
    // In a production system, you might use a proper database
    console.warn('⚠️ Event deletion not implemented in file-based storage')
    return 0
  }

  async compact(): Promise<void> {
    // Remove old files based on retention policy
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000)
    
    try {
      const files = await this.getEventFiles()
      let removedCount = 0
      
      for (const file of files) {
        const filePath = join(this.config.storePath, file)
        const stats = await fs.stat(filePath)
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath)
          removedCount++
        }
      }
      
      if (removedCount > 0) {
        console.log(`🧹 Compacted event storage: removed ${removedCount} old files`)
      }
      
    } catch (error) {
      console.error('❌ Error compacting event storage:', error)
    }
  }

  async getStats(): Promise<EventStoreStats> {
    const stats: EventStoreStats = {
      totalEvents: 0,
      eventsByType: {},
      eventsBySource: {},
      storageSize: 0
    }
    
    try {
      const files = await this.getEventFiles()
      
      for (const file of files) {
        const filePath = join(this.config.storePath, file)
        const fileStats = await fs.stat(filePath)
        stats.storageSize += fileStats.size
        
        const content = await fs.readFile(filePath, 'utf8')
        const lines = content.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line) as AgentEvent
            stats.totalEvents++
            
            // Track by type
            stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1
            
            // Track by source
            stats.eventsBySource[event.source] = (stats.eventsBySource[event.source] || 0) + 1
            
            // Track oldest/newest
            const eventTime = new Date(event.timestamp)
            if (!stats.oldestEvent || eventTime < stats.oldestEvent) {
              stats.oldestEvent = eventTime
            }
            if (!stats.newestEvent || eventTime > stats.newestEvent) {
              stats.newestEvent = eventTime
            }
            
          } catch (error) {
            // Skip invalid events
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error getting event storage stats:', error)
    }
    
    return stats
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.storePath, { recursive: true })
    } catch (error) {
      console.error('❌ Error creating storage directory:', error)
    }
  }

  private generateFileName(): string {
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-')
    return `events-${timestamp}.jsonl`
  }

  private async getEventFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.storePath)
      return files.filter(file => file.startsWith('events-') && file.endsWith('.jsonl'))
    } catch (error) {
      return []
    }
  }

  private matchesQuery(event: AgentEvent, query: EventQuery): boolean {
    if (query.fromTimestamp && new Date(event.timestamp) < query.fromTimestamp) {
      return false
    }
    
    if (query.toTimestamp && new Date(event.timestamp) > query.toTimestamp) {
      return false
    }
    
    if (query.types && !query.types.includes(event.type)) {
      return false
    }
    
    if (query.sources && !query.sources.includes(event.source)) {
      return false
    }
    
    return true
  }
}

class ReplayEventStream implements EventStream {
  private eventStore: EventStore
  private fromTimestamp: Date
  private closed = false

  constructor(eventStore: EventStore, fromTimestamp: Date) {
    this.eventStore = eventStore
    this.fromTimestamp = fromTimestamp
  }

  events: AsyncIterable<AgentEvent> = (async function* (this: ReplayEventStream) {
    const query: EventQuery = {
      fromTimestamp: this.fromTimestamp,
      orderBy: 'timestamp',
      orderDirection: 'asc'
    }
    
    const events = await this.eventStore.load(query)
    
    for (const event of events) {
      if (this.closed) break
      yield event
    }
  }).call(this)

  filter(predicate: (event: AgentEvent) => boolean): EventStream {
    const originalEvents = this.events
    
    return {
      events: (async function* () {
        for await (const event of originalEvents) {
          if (predicate(event)) {
            yield event
          }
        }
      })(),
      filter: (p) => this.filter(p),
      map: (m) => this.map(m),
      take: (c) => this.take(c),
      skip: (c) => this.skip(c),
      close: () => this.close()
    }
  }

  async *map<T>(mapper: (event: AgentEvent) => T): AsyncIterable<T> {
    for await (const event of this.events) {
      if (this.closed) break
      yield mapper(event)
    }
  }

  take(count: number): EventStream {
    const originalEvents = this.events
    let taken = 0
    
    return {
      events: (async function* () {
        for await (const event of originalEvents) {
          if (taken >= count) break
          taken++
          yield event
        }
      })(),
      filter: (p) => this.filter(p),
      map: (m) => this.map(m),
      take: (c) => this.take(c),
      skip: (c) => this.skip(c),
      close: () => this.close()
    }
  }

  skip(count: number): EventStream {
    const originalEvents = this.events
    let skipped = 0
    
    return {
      events: (async function* () {
        for await (const event of originalEvents) {
          if (skipped < count) {
            skipped++
            continue
          }
          yield event
        }
      })(),
      filter: (p) => this.filter(p),
      map: (m) => this.map(m),
      take: (c) => this.take(c),
      skip: (c) => this.skip(c),
      close: () => this.close()
    }
  }

  close(): void {
    this.closed = true
  }
}

class EventBusMetrics {
  private config: EventBusConfig['monitoring']
  private stats = {
    eventsPublished: 0,
    eventsProcessed: 0,
    errors: 0,
    slowEvents: 0,
    averageProcessingTime: 0,
    eventsByType: {} as Record<string, number>,
    eventsBySource: {} as Record<string, number>,
    errorsByType: {} as Record<string, number>
  }
  private processingTimes: number[] = []

  constructor(config: EventBusConfig['monitoring']) {
    this.config = config
  }

  recordEvent(event: AgentEvent, processingTime: number, subscriberCount: number): void {
    if (!this.config.metricsEnabled) return
    
    this.stats.eventsPublished++
    this.stats.eventsProcessed += subscriberCount
    
    this.stats.eventsByType[event.type] = (this.stats.eventsByType[event.type] || 0) + 1
    this.stats.eventsBySource[event.source] = (this.stats.eventsBySource[event.source] || 0) + 1
    
    this.processingTimes.push(processingTime)
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-1000)
    }
    
    this.stats.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
    
    if (processingTime > this.config.slowEventThresholdMs) {
      this.stats.slowEvents++
    }
  }

  recordError(type: string, error: any): void {
    if (!this.config.metricsEnabled) return
    
    this.stats.errors++
    this.stats.errorsByType[type] = (this.stats.errorsByType[type] || 0) + 1
  }

  getStats(): any {
    return { ...this.stats }
  }

  reset(): void {
    this.stats = {
      eventsPublished: 0,
      eventsProcessed: 0,
      errors: 0,
      slowEvents: 0,
      averageProcessingTime: 0,
      eventsByType: {},
      eventsBySource: {},
      errorsByType: {}
    }
    this.processingTimes = []
  }
}

// Factory function
export function createEnhancedEventBus(config?: Partial<EventBusConfig>): EnhancedEventBus {
  return new SYMindXEnhancedEventBus(config)
}