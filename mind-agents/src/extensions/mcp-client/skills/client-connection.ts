/**
 * MCP Client Connection Skill
 * 
 * Handles MCP client connections to external servers.
 */

import { Agent, ExtensionAction } from '../../../types/agent.js'
import { McpClientExtension } from '../index.js'
import { ActionResult } from '../../../types/common.js'

export class ClientConnectionSkill {
  private extension: McpClientExtension

  constructor(extension: McpClientExtension) {
    this.extension = extension
  }

  /**
   * Get all available actions for this skill
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      connect_to_server: {
        name: 'connect_to_server',
        description: 'Connect to an MCP server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to connect to',
            required: true
          },
          config: {
            type: 'object',
            description: 'Connection configuration',
            required: false
          }
        },
        execute: this.connectToServer.bind(this)
      },
      disconnect_from_server: {
        name: 'disconnect_from_server',
        description: 'Disconnect from an MCP server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to disconnect from',
            required: true
          },
          graceful: {
            type: 'boolean',
            description: 'Whether to disconnect gracefully',
            required: false
          }
        },
        execute: this.disconnectFromServer.bind(this)
      },
      get_connection_status: {
        name: 'get_connection_status',
        description: 'Get connection status for a server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to check',
            required: false
          }
        },
        execute: this.getConnectionStatus.bind(this)
      },
      list_connections: {
        name: 'list_connections',
        description: 'List all active connections',
        parameters: {
          includeInactive: {
            type: 'boolean',
            description: 'Include inactive connections',
            required: false
          }
        },
        execute: this.listConnections.bind(this)
      },
      reconnect_to_server: {
        name: 'reconnect_to_server',
        description: 'Reconnect to an MCP server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to reconnect to',
            required: true
          },
          timeout: {
            type: 'number',
            description: 'Connection timeout in milliseconds',
            required: false
          }
        },
        execute: this.reconnectToServer.bind(this)
      },
      test_connection: {
        name: 'test_connection',
        description: 'Test connection to an MCP server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to test',
            required: true
          },
          timeout: {
            type: 'number',
            description: 'Test timeout in milliseconds',
            required: false
          }
        },
        execute: this.testConnection.bind(this)
      },
      configure_connection: {
        name: 'configure_connection',
        description: 'Configure connection settings for a server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to configure',
            required: true
          },
          config: {
            type: 'object',
            description: 'Connection configuration',
            required: true
          }
        },
        execute: this.configureConnection.bind(this)
      },
      get_connection_metrics: {
        name: 'get_connection_metrics',
        description: 'Get connection performance metrics',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: false
          },
          timeRange: {
            type: 'string',
            description: 'Time range for metrics (1h, 24h, 7d)',
            required: false
          }
        },
        execute: this.getConnectionMetrics.bind(this)
      },
      reset_connection: {
        name: 'reset_connection',
        description: 'Reset connection state for a server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to reset',
            required: true
          },
          clearCache: {
            type: 'boolean',
            description: 'Whether to clear cached data',
            required: false
          }
        },
        execute: this.resetConnection.bind(this)
      },
      set_connection_timeout: {
        name: 'set_connection_timeout',
        description: 'Set connection timeout for a server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds',
            required: true
          }
        },
        execute: this.setConnectionTimeout.bind(this)
      }
    }
  }

  /**
   * Connect to an MCP server
   */
  private async connectToServer(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, config = {} } = params
      
      if (!serverId) {
        return {
          success: false,
          error: 'Server ID is required'
        }
      }

      const result = await this.extension.connectToServer(serverId, config)
      
      return {
        success: true,
        result: {
          message: `Connected to server '${serverId}'`,
          serverId,
          connectionId: result.connectionId,
          serverInfo: result.serverInfo,
          capabilities: result.capabilities,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect to server: ${error}`
      }
    }
  }

  /**
   * Disconnect from an MCP server
   */
  private async disconnectFromServer(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, graceful = true } = params
      
      if (!serverId) {
        return {
          success: false,
          error: 'Server ID is required'
        }
      }

      await this.extension.disconnectFromServer(serverId, graceful)
      
      return {
        success: true,
        result: {
          message: `Disconnected from server '${serverId}'`,
          serverId,
          graceful,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to disconnect from server: ${error}`
      }
    }
  }

  /**
   * Get connection status
   */
  private async getConnectionStatus(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId } = params
      
      if (serverId) {
        const status = this.extension.getConnectionStatus(serverId)
        if (!status) {
          return {
            success: false,
            error: `Server '${serverId}' not found`
          }
        }
        
        return {
          success: true,
          result: {
            serverId,
            status: status.status,
            connected: status.connected,
            lastActivity: status.lastActivity?.toISOString(),
            connectionTime: status.connectionTime?.toISOString(),
            serverInfo: status.serverInfo,
            metrics: status.metrics
          }
        }
      } else {
        // Get status for all servers
        const allStatuses = this.extension.getAllConnectionStatuses()
        
        return {
          success: true,
          result: {
            servers: Object.entries(allStatuses).map(([id, status]) => ({
              serverId: id,
              status: status.status,
              connected: status.connected,
              lastActivity: status.lastActivity?.toISOString(),
              connectionTime: status.connectionTime?.toISOString()
            })),
            totalServers: Object.keys(allStatuses).length,
            connectedServers: Object.values(allStatuses).filter(s => s.connected).length
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get connection status: ${error}`
      }
    }
  }

  /**
   * List all connections
   */
  private async listConnections(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { includeInactive = false } = params
      
      const connections = this.extension.listConnections(includeInactive)
      
      return {
        success: true,
        result: {
          connections: connections.map(conn => ({
            serverId: conn.serverId,
            connectionId: conn.connectionId,
            status: conn.status,
            connected: conn.connected,
            serverInfo: {
              name: conn.serverInfo?.name,
              version: conn.serverInfo?.version,
              capabilities: conn.serverInfo?.capabilities
            },
            connectionTime: conn.connectionTime?.toISOString(),
            lastActivity: conn.lastActivity?.toISOString(),
            metrics: {
              requestCount: conn.metrics?.requestCount || 0,
              errorCount: conn.metrics?.errorCount || 0,
              averageResponseTime: conn.metrics?.averageResponseTime || 0
            }
          })),
          total: connections.length,
          active: connections.filter(c => c.connected).length,
          inactive: connections.filter(c => !c.connected).length
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list connections: ${error}`
      }
    }
  }

  /**
   * Reconnect to a server
   */
  private async reconnectToServer(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, timeout = 10000 } = params
      
      if (!serverId) {
        return {
          success: false,
          error: 'Server ID is required'
        }
      }

      const result = await this.extension.reconnectToServer(serverId, timeout)
      
      return {
        success: true,
        result: {
          message: `Reconnected to server '${serverId}'`,
          serverId,
          connectionId: result.connectionId,
          reconnectionTime: result.reconnectionTime,
          previousConnectionTime: result.previousConnectionTime,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to reconnect to server: ${error}`
      }
    }
  }

  /**
   * Test connection to a server
   */
  private async testConnection(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, timeout = 5000 } = params
      
      if (!serverId) {
        return {
          success: false,
          error: 'Server ID is required'
        }
      }

      const startTime = Date.now()
      const result = await this.extension.testConnection(serverId, timeout)
      const responseTime = Date.now() - startTime
      
      return {
        success: true,
        result: {
          serverId,
          testSuccessful: result.success,
          responseTime,
          serverResponse: result.response,
          errorMessage: result.error,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Connection test failed: ${error}`
      }
    }
  }

  /**
   * Configure connection settings
   */
  private async configureConnection(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, config } = params
      
      if (!serverId || !config) {
        return {
          success: false,
          error: 'Server ID and configuration are required'
        }
      }

      await this.extension.configureConnection(serverId, config)
      
      return {
        success: true,
        result: {
          message: `Connection configured for server '${serverId}'`,
          serverId,
          configuration: config,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to configure connection: ${error}`
      }
    }
  }

  /**
   * Get connection metrics
   */
  private async getConnectionMetrics(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, timeRange = '1h' } = params
      
      const metrics = this.extension.getConnectionMetrics(serverId, timeRange)
      
      return {
        success: true,
        result: {
          serverId,
          timeRange,
          metrics: {
            requestCount: metrics.requestCount,
            successfulRequests: metrics.successfulRequests,
            failedRequests: metrics.failedRequests,
            averageResponseTime: metrics.averageResponseTime,
            minResponseTime: metrics.minResponseTime,
            maxResponseTime: metrics.maxResponseTime,
            connectionUptime: metrics.connectionUptime,
            disconnectionCount: metrics.disconnectionCount,
            lastDisconnection: metrics.lastDisconnection?.toISOString(),
            dataTransferred: {
              sent: metrics.dataTransferred?.sent || 0,
              received: metrics.dataTransferred?.received || 0
            }
          },
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get connection metrics: ${error}`
      }
    }
  }

  /**
   * Reset connection state
   */
  private async resetConnection(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, clearCache = false } = params
      
      if (!serverId) {
        return {
          success: false,
          error: 'Server ID is required'
        }
      }

      await this.extension.resetConnection(serverId, clearCache)
      
      return {
        success: true,
        result: {
          message: `Connection reset for server '${serverId}'`,
          serverId,
          cacheCleared: clearCache,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to reset connection: ${error}`
      }
    }
  }

  /**
   * Set connection timeout
   */
  private async setConnectionTimeout(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, timeout } = params
      
      if (!serverId || timeout === undefined) {
        return {
          success: false,
          error: 'Server ID and timeout are required'
        }
      }

      if (timeout < 1000 || timeout > 300000) {
        return {
          success: false,
          error: 'Timeout must be between 1000ms and 300000ms'
        }
      }

      await this.extension.setConnectionTimeout(serverId, timeout)
      
      return {
        success: true,
        result: {
          message: `Connection timeout set for server '${serverId}'`,
          serverId,
          timeout,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to set connection timeout: ${error}`
      }
    }
  }
}