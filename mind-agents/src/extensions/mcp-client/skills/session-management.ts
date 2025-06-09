/**
 * MCP Client Session Management Skill
 * 
 * Handles session management for MCP client connections.
 */

import { Agent, ExtensionAction } from '../../../types/agent.js'
import { McpClientExtension } from '../index.js'
import { ActionResult } from '../../../types/common.js'

export class SessionManagementSkill {
  private extension: McpClientExtension

  constructor(extension: McpClientExtension) {
    this.extension = extension
  }

  /**
   * Get all available actions for this skill
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      create_session: {
        name: 'create_session',
        description: 'Create a new session with a server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to create session with',
            required: true
          },
          sessionConfig: {
            type: 'object',
            description: 'Session configuration',
            required: false
          },
          persistent: {
            type: 'boolean',
            description: 'Whether the session should be persistent',
            required: false
          }
        },
        execute: this.createSession.bind(this)
      },
      get_session: {
        name: 'get_session',
        description: 'Get session information',
        parameters: {
          sessionId: {
            type: 'string',
            description: 'ID of the session',
            required: true
          },
          includeMetrics: {
            type: 'boolean',
            description: 'Include session metrics',
            required: false
          }
        },
        execute: this.getSession.bind(this)
      },
      list_sessions: {
        name: 'list_sessions',
        description: 'List all active sessions',
        parameters: {
          serverId: {
            type: 'string',
            description: 'Filter by server ID',
            required: false
          },
          status: {
            type: 'string',
            description: 'Filter by session status',
            required: false
          },
          includeInactive: {
            type: 'boolean',
            description: 'Include inactive sessions',
            required: false
          }
        },
        execute: this.listSessions.bind(this)
      },
      update_session: {
        name: 'update_session',
        description: 'Update session configuration',
        parameters: {
          sessionId: {
            type: 'string',
            description: 'ID of the session to update',
            required: true
          },
          config: {
            type: 'object',
            description: 'Updated configuration',
            required: true
          }
        },
        execute: this.updateSession.bind(this)
      },
      extend_session: {
        name: 'extend_session',
        description: 'Extend session timeout',
        parameters: {
          sessionId: {
            type: 'string',
            description: 'ID of the session to extend',
            required: true
          },
          duration: {
            type: 'number',
            description: 'Extension duration in milliseconds',
            required: false
          }
        },
        execute: this.extendSession.bind(this)
      },
      close_session: {
        name: 'close_session',
        description: 'Close a session',
        parameters: {
          sessionId: {
            type: 'string',
            description: 'ID of the session to close',
            required: true
          },
          reason: {
            type: 'string',
            description: 'Reason for closing the session',
            required: false
          }
        },
        execute: this.closeSession.bind(this)
      },
      get_session_metrics: {
        name: 'get_session_metrics',
        description: 'Get session performance metrics',
        parameters: {
          sessionId: {
            type: 'string',
            description: 'ID of the session',
            required: false
          },
          serverId: {
            type: 'string',
            description: 'Filter by server ID',
            required: false
          },
          timeRange: {
            type: 'object',
            description: 'Time range for metrics',
            required: false
          }
        },
        execute: this.getSessionMetrics.bind(this)
      },
      cleanup_sessions: {
        name: 'cleanup_sessions',
        description: 'Clean up inactive or expired sessions',
        parameters: {
          serverId: {
            type: 'string',
            description: 'Limit cleanup to specific server',
            required: false
          },
          maxAge: {
            type: 'number',
            description: 'Maximum age in milliseconds',
            required: false
          },
          force: {
            type: 'boolean',
            description: 'Force cleanup of active sessions',
            required: false
          }
        },
        execute: this.cleanupSessions.bind(this)
      },
      save_session_state: {
        name: 'save_session_state',
        description: 'Save session state for persistence',
        parameters: {
          sessionId: {
            type: 'string',
            description: 'ID of the session to save',
            required: true
          },
          stateName: {
            type: 'string',
            description: 'Name for the saved state',
            required: false
          }
        },
        execute: this.saveSessionState.bind(this)
      },
      restore_session_state: {
        name: 'restore_session_state',
        description: 'Restore session from saved state',
        parameters: {
          sessionId: {
            type: 'string',
            description: 'ID of the session to restore',
            required: true
          },
          stateName: {
            type: 'string',
            description: 'Name of the saved state',
            required: true
          }
        },
        execute: this.restoreSessionState.bind(this)
      }
    }
  }

  /**
   * Create a new session with a server
   */
  private async createSession(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, sessionConfig = {}, persistent = false } = params
      
      if (!serverId) {
        return {
          success: false,
          error: 'Server ID is required'
        }
      }

      const session = await this.extension.createSession({
        serverId,
        config: sessionConfig,
        persistent
      })
      
      return {
        success: true,
        result: {
          sessionId: session.sessionId,
          serverId,
          status: session.status,
          persistent,
          createdAt: session.createdAt?.toISOString(),
          expiresAt: session.expiresAt?.toISOString(),
          config: session.config,
          capabilities: session.capabilities,
          metadata: session.metadata
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create session: ${error}`
      }
    }
  }

  /**
   * Get session information
   */
  private async getSession(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId, includeMetrics = false } = params
      
      if (!sessionId) {
        return {
          success: false,
          error: 'Session ID is required'
        }
      }

      const session = await this.extension.getSession(sessionId, {
        includeMetrics
      })
      
      if (!session) {
        return {
          success: false,
          error: `Session '${sessionId}' not found`
        }
      }

      return {
        success: true,
        result: {
          sessionId: session.sessionId,
          serverId: session.serverId,
          serverName: session.serverName,
          status: session.status,
          persistent: session.persistent,
          createdAt: session.createdAt?.toISOString(),
          lastActivity: session.lastActivity?.toISOString(),
          expiresAt: session.expiresAt?.toISOString(),
          config: session.config,
          capabilities: session.capabilities,
          connectionInfo: {
            connected: session.connectionInfo?.connected || false,
            connectionTime: session.connectionInfo?.connectionTime?.toISOString(),
            lastPing: session.connectionInfo?.lastPing?.toISOString(),
            responseTime: session.connectionInfo?.responseTime
          },
          metrics: includeMetrics ? {
            requestCount: session.metrics?.requestCount || 0,
            responseCount: session.metrics?.responseCount || 0,
            errorCount: session.metrics?.errorCount || 0,
            averageResponseTime: session.metrics?.averageResponseTime || 0,
            dataTransferred: session.metrics?.dataTransferred || 0,
            uptime: session.metrics?.uptime || 0
          } : undefined,
          metadata: session.metadata
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get session: ${error}`
      }
    }
  }

  /**
   * List all active sessions
   */
  private async listSessions(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, status, includeInactive = false } = params
      
      const sessions = await this.extension.listSessions({
        serverId,
        status,
        includeInactive
      })
      
      return {
        success: true,
        result: {
          sessions: sessions.map(session => ({
            sessionId: session.sessionId,
            serverId: session.serverId,
            serverName: session.serverName,
            status: session.status,
            persistent: session.persistent,
            createdAt: session.createdAt?.toISOString(),
            lastActivity: session.lastActivity?.toISOString(),
            expiresAt: session.expiresAt?.toISOString(),
            connected: session.connected,
            requestCount: session.requestCount || 0,
            errorCount: session.errorCount || 0
          })),
          total: sessions.length,
          active: sessions.filter(s => s.status === 'active').length,
          inactive: sessions.filter(s => s.status === 'inactive').length,
          expired: sessions.filter(s => s.status === 'expired').length,
          servers: [...new Set(sessions.map(s => s.serverId))],
          filters: { serverId, status, includeInactive }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list sessions: ${error}`
      }
    }
  }

  /**
   * Update session configuration
   */
  private async updateSession(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId, config } = params
      
      if (!sessionId || !config) {
        return {
          success: false,
          error: 'Session ID and configuration are required'
        }
      }

      const result = await this.extension.updateSession(sessionId, config)
      
      return {
        success: true,
        result: {
          message: `Session '${sessionId}' updated`,
          sessionId,
          updatedFields: result.updatedFields,
          previousConfig: result.previousConfig,
          newConfig: result.newConfig,
          requiresReconnection: result.requiresReconnection,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to update session: ${error}`
      }
    }
  }

  /**
   * Extend session timeout
   */
  private async extendSession(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId, duration = 3600000 } = params // Default 1 hour
      
      if (!sessionId) {
        return {
          success: false,
          error: 'Session ID is required'
        }
      }

      const result = await this.extension.extendSession(sessionId, duration)
      
      return {
        success: true,
        result: {
          message: `Session '${sessionId}' extended`,
          sessionId,
          previousExpiresAt: result.previousExpiresAt?.toISOString(),
          newExpiresAt: result.newExpiresAt?.toISOString(),
          extensionDuration: duration,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to extend session: ${error}`
      }
    }
  }

  /**
   * Close a session
   */
  private async closeSession(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId, reason = 'User requested' } = params
      
      if (!sessionId) {
        return {
          success: false,
          error: 'Session ID is required'
        }
      }

      const result = await this.extension.closeSession(sessionId, reason)
      
      return {
        success: true,
        result: {
          message: `Session '${sessionId}' closed`,
          sessionId,
          reason,
          closedAt: new Date().toISOString(),
          duration: result.duration,
          finalMetrics: {
            requestCount: result.finalMetrics?.requestCount || 0,
            responseCount: result.finalMetrics?.responseCount || 0,
            errorCount: result.finalMetrics?.errorCount || 0,
            dataTransferred: result.finalMetrics?.dataTransferred || 0
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to close session: ${error}`
      }
    }
  }

  /**
   * Get session performance metrics
   */
  private async getSessionMetrics(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId, serverId, timeRange } = params
      
      const metrics = await this.extension.getSessionMetrics({
        sessionId,
        serverId,
        timeRange
      })
      
      return {
        success: true,
        result: {
          metrics: {
            sessions: {
              total: metrics.sessions?.total || 0,
              active: metrics.sessions?.active || 0,
              inactive: metrics.sessions?.inactive || 0,
              averageDuration: metrics.sessions?.averageDuration || 0
            },
            requests: {
              total: metrics.requests?.total || 0,
              successful: metrics.requests?.successful || 0,
              failed: metrics.requests?.failed || 0,
              averageResponseTime: metrics.requests?.averageResponseTime || 0,
              requestsPerSecond: metrics.requests?.requestsPerSecond || 0
            },
            data: {
              bytesTransferred: metrics.data?.bytesTransferred || 0,
              bytesReceived: metrics.data?.bytesReceived || 0,
              bytesSent: metrics.data?.bytesSent || 0,
              compressionRatio: metrics.data?.compressionRatio || 0
            },
            errors: {
              total: metrics.errors?.total || 0,
              byType: metrics.errors?.byType || {},
              errorRate: metrics.errors?.errorRate || 0
            },
            performance: {
              averageLatency: metrics.performance?.averageLatency || 0,
              p95Latency: metrics.performance?.p95Latency || 0,
              p99Latency: metrics.performance?.p99Latency || 0,
              throughput: metrics.performance?.throughput || 0
            }
          },
          timeRange: {
            start: timeRange?.start || metrics.timeRange?.start?.toISOString(),
            end: timeRange?.end || metrics.timeRange?.end?.toISOString(),
            duration: metrics.timeRange?.duration
          },
          filters: { sessionId, serverId },
          generatedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get session metrics: ${error}`
      }
    }
  }

  /**
   * Clean up inactive or expired sessions
   */
  private async cleanupSessions(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, maxAge = 86400000, force = false } = params // Default 24 hours
      
      const result = await this.extension.cleanupSessions({
        serverId,
        maxAge,
        force
      })
      
      return {
        success: true,
        result: {
          message: `Session cleanup completed`,
          sessionsRemoved: result.sessionsRemoved,
          sessionsClosed: result.sessionsClosed,
          sessionsSkipped: result.sessionsSkipped,
          totalProcessed: result.totalProcessed,
          cleanupTime: result.cleanupTime,
          filters: { serverId, maxAge, force },
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Session cleanup failed: ${error}`
      }
    }
  }

  /**
   * Save session state for persistence
   */
  private async saveSessionState(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId, stateName } = params
      
      if (!sessionId) {
        return {
          success: false,
          error: 'Session ID is required'
        }
      }

      const result = await this.extension.saveSessionState({
        sessionId,
        stateName
      })
      
      return {
        success: true,
        result: {
          message: `Session state saved`,
          sessionId,
          stateName: result.stateName,
          stateId: result.stateId,
          savedAt: new Date().toISOString(),
          stateSize: result.stateSize,
          includesData: result.includesData
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to save session state: ${error}`
      }
    }
  }

  /**
   * Restore session from saved state
   */
  private async restoreSessionState(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId, stateName } = params
      
      if (!sessionId || !stateName) {
        return {
          success: false,
          error: 'Session ID and state name are required'
        }
      }

      const result = await this.extension.restoreSessionState({
        sessionId,
        stateName
      })
      
      return {
        success: true,
        result: {
          message: `Session state restored`,
          sessionId,
          stateName,
          stateId: result.stateId,
          restoredAt: new Date().toISOString(),
          restoredData: result.restoredData,
          requiresReconnection: result.requiresReconnection
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to restore session state: ${error}`
      }
    }
  }
}