/**
 * Observability Module
 * 
 * This module provides comprehensive monitoring and observability capabilities
 * including metrics collection, distributed tracing, structured logging, and health checks.
 */

import { EventEmitter } from 'events'
import { Agent } from '../../types/agent.js'
import { GenericData, Metadata } from '../../types/common.js'

export interface ObservabilityModule {
  metrics: MetricsCollector
  tracing: DistributedTracing
  logging: StructuredLogger
  healthChecks: HealthMonitor
}

export interface MetricsCollector {
  counter(name: string, value?: number, tags?: Record<string, string>): void
  gauge(name: string, value: number, tags?: Record<string, string>): void
  histogram(name: string, value: number, tags?: Record<string, string>): void
  timing(name: string, duration: number, tags?: Record<string, string>): void
  getMetrics(): MetricSnapshot[]
  reset(): void
}

export interface DistributedTracing {
  startSpan(name: string, parentSpan?: Span): Span
  finishSpan(span: Span): void
  getActiveSpan(): Span | null
  getTraces(): Trace[]
}

export interface StructuredLogger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, error?: Error, context?: LogContext): void
  getLogs(level?: LogLevel, limit?: number): LogEntry[]
  setLevel(level: LogLevel): void
}

export interface HealthMonitor {
  registerCheck(name: string, check: HealthCheck): void
  unregisterCheck(name: string): void
  runChecks(): Promise<HealthReport>
  getStatus(): HealthStatus
  onStatusChange(callback: (status: HealthStatus) => void): void
}

// Types
export interface MetricSnapshot {
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'timing'
  value: number
  tags: Record<string, string>
  timestamp: Date
}

export interface Span {
  id: string
  traceId: string
  parentId?: string
  name: string
  startTime: Date
  endTime?: Date
  duration?: number
  tags: Metadata
  logs: SpanLog[]
  status: 'active' | 'finished' | 'error'
}

export interface Trace {
  id: string
  spans: Span[]
  startTime: Date
  endTime?: Date
  duration?: number
  status: 'active' | 'finished' | 'error'
}

export interface SpanLog {
  timestamp: Date
  level: LogLevel
  message: string
  fields?: GenericData
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  agentId?: string
  extensionId?: string
  traceId?: string
  spanId?: string
  [key: string]: any
}

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export interface HealthCheck {
  name: string
  description: string
  check: () => Promise<HealthCheckResult>
  timeout?: number
  interval?: number
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  message?: string
  details?: GenericData
  duration?: number
}

export interface HealthReport {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
  timestamp: Date
  checks: Record<string, HealthCheckResult>
  summary: {
    total: number
    healthy: number
    unhealthy: number
    degraded: number
  }
}

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded' | 'unknown'

export interface ObservabilityConfig {
  metrics: {
    enabled: boolean
    retentionMs: number
    maxMetrics: number
  }
  tracing: {
    enabled: boolean
    sampleRate: number
    maxTraces: number
    retentionMs: number
  }
  logging: {
    level: LogLevel
    maxLogs: number
    retentionMs: number
    includeStackTrace: boolean
  }
  health: {
    enabled: boolean
    checkIntervalMs: number
    defaultTimeoutMs: number
  }
}

// Implementations
export class SYMindXMetricsCollector implements MetricsCollector {
  private metrics: MetricSnapshot[] = []
  private config: ObservabilityConfig['metrics']

  constructor(config: Partial<ObservabilityConfig['metrics']> = {}) {
    this.config = {
      enabled: true,
      retentionMs: 24 * 60 * 60 * 1000, // 24 hours
      maxMetrics: 10000,
      ...config
    }

    // Clean up old metrics periodically
    if (this.config.enabled) {
      setInterval(() => this.cleanupOldMetrics(), 60000) // Every minute
    }
  }

  counter(name: string, value = 1, tags: Record<string, string> = {}): void {
    if (!this.config.enabled) return

    this.addMetric({
      name,
      type: 'counter',
      value,
      tags,
      timestamp: new Date()
    })
  }

  gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.config.enabled) return

    this.addMetric({
      name,
      type: 'gauge',
      value,
      tags,
      timestamp: new Date()
    })
  }

  histogram(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.config.enabled) return

    this.addMetric({
      name,
      type: 'histogram',
      value,
      tags,
      timestamp: new Date()
    })
  }

  timing(name: string, duration: number, tags: Record<string, string> = {}): void {
    if (!this.config.enabled) return

    this.addMetric({
      name,
      type: 'timing',
      value: duration,
      tags,
      timestamp: new Date()
    })
  }

  getMetrics(): MetricSnapshot[] {
    return [...this.metrics]
  }

  reset(): void {
    this.metrics = []
    console.log('📊 Metrics reset')
  }

  private addMetric(metric: MetricSnapshot): void {
    this.metrics.push(metric)

    // Trim if too many metrics
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics)
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.config.retentionMs)
    const originalLength = this.metrics.length
    
    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoff)
    
    const removed = originalLength - this.metrics.length
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old metrics`)
    }
  }
}

export class SYMindXDistributedTracing implements DistributedTracing {
  private traces: Map<string, Trace> = new Map()
  private activeSpans: Map<string, Span> = new Map()
  private config: ObservabilityConfig['tracing']
  private currentSpan: Span | null = null

  constructor(config: Partial<ObservabilityConfig['tracing']> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 1.0, // Sample 100% by default
      maxTraces: 1000,
      retentionMs: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    }

    // Clean up old traces periodically
    if (this.config.enabled) {
      setInterval(() => this.cleanupOldTraces(), 60000) // Every minute
    }
  }

  startSpan(name: string, parentSpan?: Span): Span {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      // Return a no-op span if disabled or not sampled
      return this.createNoOpSpan(name)
    }

    const traceId = parentSpan?.traceId || this.generateId()
    const spanId = this.generateId()
    
    const span: Span = {
      id: spanId,
      traceId,
      parentId: parentSpan?.id,
      name,
      startTime: new Date(),
      tags: {},
      logs: [],
      status: 'active'
    }

    this.activeSpans.set(spanId, span)
    this.currentSpan = span

    // Add to trace
    let trace = this.traces.get(traceId)
    if (!trace) {
      trace = {
        id: traceId,
        spans: [],
        startTime: new Date(),
        status: 'active'
      }
      this.traces.set(traceId, trace)
    }
    
    trace.spans.push(span)

    console.log(`🔍 Started span ${name} (${spanId}) in trace ${traceId}`)
    return span
  }

  finishSpan(span: Span): void {
    if (!this.config.enabled || !span.id) return

    span.endTime = new Date()
    span.duration = span.endTime.getTime() - span.startTime.getTime()
    span.status = 'finished'

    this.activeSpans.delete(span.id)
    
    // Update current span
    if (this.currentSpan?.id === span.id) {
      this.currentSpan = span.parentId ? this.activeSpans.get(span.parentId) || null : null
    }

    // Update trace status
    const trace = this.traces.get(span.traceId)
    if (trace) {
      const activeSpans = trace.spans.filter(s => s.status === 'active')
      if (activeSpans.length === 0) {
        trace.status = 'finished'
        trace.endTime = new Date()
        trace.duration = trace.endTime.getTime() - trace.startTime.getTime()
      }
    }

    console.log(`🔍 Finished span ${span.name} (${span.id}) - ${span.duration}ms`)
  }

  getActiveSpan(): Span | null {
    return this.currentSpan
  }

  getTraces(): Trace[] {
    return Array.from(this.traces.values())
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 16)
  }

  private createNoOpSpan(name: string): Span {
    return {
      id: '',
      traceId: '',
      name,
      startTime: new Date(),
      tags: {},
      logs: [],
      status: 'active'
    }
  }

  private cleanupOldTraces(): void {
    const cutoff = new Date(Date.now() - this.config.retentionMs)
    const originalSize = this.traces.size
    
    for (const [traceId, trace] of Array.from(this.traces.entries())) {
      if (trace.startTime < cutoff) {
        this.traces.delete(traceId)
      }
    }
    
    const removed = originalSize - this.traces.size
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old traces`)
    }
  }
}

export class SYMindXStructuredLogger implements StructuredLogger {
  private logs: LogEntry[] = []
  private config: ObservabilityConfig['logging']
  private currentLevel: LogLevel

  constructor(config: Partial<ObservabilityConfig['logging']> = {}) {
    this.config = {
      level: 'info',
      maxLogs: 10000,
      retentionMs: 24 * 60 * 60 * 1000, // 24 hours
      includeStackTrace: true,
      ...config
    }

    this.currentLevel = this.config.level

    // Clean up old logs periodically
    setInterval(() => this.cleanupOldLogs(), 60000) // Every minute
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, undefined, context)
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, undefined, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, undefined, context)
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, error, context)
  }

  getLogs(level?: LogLevel, limit = 1000): LogEntry[] {
    let filteredLogs = this.logs
    
    if (level) {
      const levelPriority = this.getLevelPriority(level)
      filteredLogs = this.logs.filter(log => this.getLevelPriority(log.level) >= levelPriority)
    }
    
    return filteredLogs.slice(-limit)
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level
    console.log(`📝 Log level set to ${level}`)
  }

  private log(level: LogLevel, message: string, error?: Error, context?: LogContext): void {
    if (this.getLevelPriority(level) < this.getLevelPriority(this.currentLevel)) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.config.includeStackTrace ? error.stack : undefined
      }
    }

    this.logs.push(entry)

    // Trim if too many logs
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs)
    }

    // Also log to console
    const contextStr = context ? ` [${JSON.stringify(context)}]` : ''
    const errorStr = error ? ` - ${error.message}` : ''
    console.log(`[${level.toUpperCase()}] ${message}${contextStr}${errorStr}`)
  }

  private getLevelPriority(level: LogLevel): number {
    const priorities = { debug: 0, info: 1, warn: 2, error: 3 }
    return priorities[level] || 0
  }

  private cleanupOldLogs(): void {
    const cutoff = new Date(Date.now() - this.config.retentionMs)
    const originalLength = this.logs.length
    
    this.logs = this.logs.filter(log => log.timestamp >= cutoff)
    
    const removed = originalLength - this.logs.length
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old log entries`)
    }
  }
}

export class SYMindXHealthMonitor extends EventEmitter implements HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map()
  private lastReport: HealthReport | null = null
  private config: ObservabilityConfig['health']
  private checkTimer?: NodeJS.Timeout
  private currentStatus: HealthStatus = 'unknown'

  constructor(config: Partial<ObservabilityConfig['health']> = {}) {
    super()
    
    this.config = {
      enabled: true,
      checkIntervalMs: 30000, // 30 seconds
      defaultTimeoutMs: 5000, // 5 seconds
      ...config
    }

    if (this.config.enabled) {
      this.startPeriodicChecks()
    }
  }

  registerCheck(name: string, check: HealthCheck): void {
    this.checks.set(name, {
      timeout: this.config.defaultTimeoutMs,
      interval: this.config.checkIntervalMs,
      ...check
    })
    
    console.log(`🏥 Health check '${name}' registered`)
  }

  unregisterCheck(name: string): void {
    this.checks.delete(name)
    console.log(`🏥 Health check '${name}' unregistered`)
  }

  async runChecks(): Promise<HealthReport> {
    const timestamp = new Date()
    const checkResults: Record<string, HealthCheckResult> = {}
    
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      const startTime = Date.now()
      
      try {
        const timeoutPromise = new Promise<HealthCheckResult>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Health check '${name}' timed out`))
          }, check.timeout || this.config.defaultTimeoutMs)
        })
        
        const checkPromise = check.check()
        const result = await Promise.race([checkPromise, timeoutPromise])
        
        result.duration = Date.now() - startTime
        checkResults[name] = result
        
      } catch (error) {
        checkResults[name] = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        }
      }
    })

    await Promise.all(checkPromises)

    // Calculate overall status
    const results = Object.values(checkResults)
    const healthy = results.filter(r => r.status === 'healthy').length
    const unhealthy = results.filter(r => r.status === 'unhealthy').length
    const degraded = results.filter(r => r.status === 'degraded').length
    
    let overallStatus: HealthStatus
    if (unhealthy > 0) {
      overallStatus = 'unhealthy'
    } else if (degraded > 0) {
      overallStatus = 'degraded'
    } else if (healthy > 0) {
      overallStatus = 'healthy'
    } else {
      overallStatus = 'unknown'
    }

    const report: HealthReport = {
      status: overallStatus,
      timestamp,
      checks: checkResults,
      summary: {
        total: results.length,
        healthy,
        unhealthy,
        degraded
      }
    }

    this.lastReport = report
    
    // Emit status change if different
    if (this.currentStatus !== overallStatus) {
      const previousStatus = this.currentStatus
      this.currentStatus = overallStatus
      this.emit('statusChange', overallStatus, previousStatus)
      console.log(`🏥 Health status changed from ${previousStatus} to ${overallStatus}`)
    }

    return report
  }

  getStatus(): HealthStatus {
    return this.currentStatus
  }

  onStatusChange(callback: (status: HealthStatus) => void): void {
    this.on('statusChange', callback)
  }

  getLastReport(): HealthReport | null {
    return this.lastReport
  }

  private startPeriodicChecks(): void {
    this.checkTimer = setInterval(async () => {
      try {
        await this.runChecks()
      } catch (error) {
        console.error('Error running health checks:', error)
      }
    }, this.config.checkIntervalMs)
    
    console.log(`🏥 Health monitor started with ${this.config.checkIntervalMs}ms interval`)
  }

  destroy(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = undefined
    }
    
    this.checks.clear()
    this.removeAllListeners()
    console.log('🏥 Health monitor destroyed')
  }
}

// Factory function to create observability module
export function createObservabilityModule(config?: Partial<ObservabilityConfig>): ObservabilityModule {
  const fullConfig: ObservabilityConfig = {
    metrics: {
      enabled: true,
      retentionMs: 24 * 60 * 60 * 1000,
      maxMetrics: 10000
    },
    tracing: {
      enabled: true,
      sampleRate: 1.0,
      maxTraces: 1000,
      retentionMs: 24 * 60 * 60 * 1000
    },
    logging: {
      level: 'info',
      maxLogs: 10000,
      retentionMs: 24 * 60 * 60 * 1000,
      includeStackTrace: true
    },
    health: {
      enabled: true,
      checkIntervalMs: 30000,
      defaultTimeoutMs: 5000
    },
    ...config
  }

  return {
    metrics: new SYMindXMetricsCollector(fullConfig.metrics),
    tracing: new SYMindXDistributedTracing(fullConfig.tracing),
    logging: new SYMindXStructuredLogger(fullConfig.logging),
    healthChecks: new SYMindXHealthMonitor(fullConfig.health)
  }
}

// Utility function to create basic health checks
export function createBasicHealthChecks(): HealthCheck[] {
  return [
    {
      name: 'memory',
      description: 'Check memory usage',
      check: async () => {
        const usage = process.memoryUsage()
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024)
        const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100
        
        let status: 'healthy' | 'degraded' | 'unhealthy'
        if (heapUsagePercent > 90) {
          status = 'unhealthy'
        } else if (heapUsagePercent > 75) {
          status = 'degraded'
        } else {
          status = 'healthy'
        }
        
        return {
          status,
          message: `Heap usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent.toFixed(1)}%)`,
          details: {
            heapUsed: heapUsedMB,
            heapTotal: heapTotalMB,
            heapUsagePercent: heapUsagePercent.toFixed(1),
            rss: Math.round(usage.rss / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024)
          }
        }
      }
    },
    {
      name: 'uptime',
      description: 'Check process uptime',
      check: async () => {
        const uptimeSeconds = process.uptime()
        const uptimeMinutes = Math.floor(uptimeSeconds / 60)
        const uptimeHours = Math.floor(uptimeMinutes / 60)
        
        return {
          status: 'healthy',
          message: `Uptime: ${uptimeHours}h ${uptimeMinutes % 60}m ${Math.floor(uptimeSeconds % 60)}s`,
          details: {
            uptimeSeconds,
            uptimeMinutes,
            uptimeHours
          }
        }
      }
    },
    {
      name: 'event_loop',
      description: 'Check event loop lag',
      check: async () => {
        return new Promise<HealthCheckResult>((resolve) => {
          const start = process.hrtime.bigint()
          setImmediate(() => {
            const lag = Number(process.hrtime.bigint() - start) / 1000000 // Convert to ms
            
            let status: 'healthy' | 'degraded' | 'unhealthy'
            if (lag > 100) {
              status = 'unhealthy'
            } else if (lag > 50) {
              status = 'degraded'
            } else {
              status = 'healthy'
            }
            
            resolve({
              status,
              message: `Event loop lag: ${lag.toFixed(2)}ms`,
              details: { lagMs: lag }
            })
          })
        })
      }
    }
  ]
}