/**
 * MCP Client Server Discovery Skill
 * 
 * Handles discovery and registration of MCP servers.
 */

import { Agent, ExtensionAction } from '../../../types/agent.js'
import { McpClientExtension } from '../index.js'
import { ActionResult } from '../../../types/common.js'

export class ServerDiscoverySkill {
  private extension: McpClientExtension

  constructor(extension: McpClientExtension) {
    this.extension = extension
  }

  /**
   * Get all available actions for this skill
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      discover_servers: {
        name: 'discover_servers',
        description: 'Discover available MCP servers',
        parameters: {
          network: {
            type: 'string',
            description: 'Network to scan (local, remote, all)',
            required: false
          },
          timeout: {
            type: 'number',
            description: 'Discovery timeout in milliseconds',
            required: false
          }
        },
        execute: this.discoverServers.bind(this)
      },
      register_server: {
        name: 'register_server',
        description: 'Register a new MCP server',
        parameters: {
          serverConfig: {
            type: 'object',
            description: 'Server configuration',
            required: true
          }
        },
        execute: this.registerServer.bind(this)
      },
      unregister_server: {
        name: 'unregister_server',
        description: 'Unregister an MCP server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to unregister',
            required: true
          }
        },
        execute: this.unregisterServer.bind(this)
      },
      list_registered_servers: {
        name: 'list_registered_servers',
        description: 'List all registered MCP servers',
        parameters: {
          includeOffline: {
            type: 'boolean',
            description: 'Include offline servers',
            required: false
          },
          category: {
            type: 'string',
            description: 'Filter by server category',
            required: false
          }
        },
        execute: this.listRegisteredServers.bind(this)
      },
      get_server_info: {
        name: 'get_server_info',
        description: 'Get detailed information about a server',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server',
            required: true
          },
          includeCapabilities: {
            type: 'boolean',
            description: 'Include server capabilities',
            required: false
          }
        },
        execute: this.getServerInfo.bind(this)
      },
      scan_network: {
        name: 'scan_network',
        description: 'Scan network for MCP servers',
        parameters: {
          subnet: {
            type: 'string',
            description: 'Subnet to scan (e.g., 192.168.1.0/24)',
            required: false
          },
          ports: {
            type: 'array',
            description: 'Ports to scan',
            required: false
          },
          timeout: {
            type: 'number',
            description: 'Scan timeout per host',
            required: false
          }
        },
        execute: this.scanNetwork.bind(this)
      },
      validate_server: {
        name: 'validate_server',
        description: 'Validate server configuration and connectivity',
        parameters: {
          serverConfig: {
            type: 'object',
            description: 'Server configuration to validate',
            required: true
          }
        },
        execute: this.validateServer.bind(this)
      },
      import_server_config: {
        name: 'import_server_config',
        description: 'Import server configuration from file or URL',
        parameters: {
          source: {
            type: 'string',
            description: 'File path or URL to import from',
            required: true
          },
          format: {
            type: 'string',
            description: 'Configuration format (json, yaml, toml)',
            required: false
          }
        },
        execute: this.importServerConfig.bind(this)
      },
      export_server_config: {
        name: 'export_server_config',
        description: 'Export server configuration to file',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to export',
            required: false
          },
          destination: {
            type: 'string',
            description: 'File path to export to',
            required: true
          },
          format: {
            type: 'string',
            description: 'Export format (json, yaml, toml)',
            required: false
          }
        },
        execute: this.exportServerConfig.bind(this)
      },
      update_server_config: {
        name: 'update_server_config',
        description: 'Update server configuration',
        parameters: {
          serverId: {
            type: 'string',
            description: 'ID of the server to update',
            required: true
          },
          config: {
            type: 'object',
            description: 'Updated configuration',
            required: true
          }
        },
        execute: this.updateServerConfig.bind(this)
      }
    }
  }

  /**
   * Discover available MCP servers
   */
  private async discoverServers(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { network = 'all', timeout = 10000 } = params
      
      const discoveredServers = await this.extension.discoverServers({
        network,
        timeout
      })
      
      return {
        success: true,
        result: {
          servers: discoveredServers.map(server => ({
            id: server.id,
            name: server.name,
            version: server.version,
            host: server.host,
            port: server.port,
            protocol: server.protocol,
            capabilities: server.capabilities,
            description: server.description,
            category: server.category,
            discoveryMethod: server.discoveryMethod,
            responseTime: server.responseTime,
            lastSeen: server.lastSeen?.toISOString()
          })),
          total: discoveredServers.length,
          discoveryTime: new Date().toISOString(),
          network,
          timeout
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Server discovery failed: ${error}`
      }
    }
  }

  /**
   * Register a new MCP server
   */
  private async registerServer(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverConfig } = params
      
      if (!serverConfig) {
        return {
          success: false,
          error: 'Server configuration is required'
        }
      }

      // Validate required fields
      if (!serverConfig.id || !serverConfig.name || !serverConfig.host) {
        return {
          success: false,
          error: 'Server configuration must include id, name, and host'
        }
      }

      const result = await this.extension.registerServer(serverConfig)
      
      return {
        success: true,
        result: {
          message: `Server '${serverConfig.name}' registered successfully`,
          serverId: result.serverId,
          serverInfo: result.serverInfo,
          registered: true,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to register server: ${error}`
      }
    }
  }

  /**
   * Unregister an MCP server
   */
  private async unregisterServer(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId } = params
      
      if (!serverId) {
        return {
          success: false,
          error: 'Server ID is required'
        }
      }

      await this.extension.unregisterServer(serverId)
      
      return {
        success: true,
        result: {
          message: `Server '${serverId}' unregistered successfully`,
          serverId,
          unregistered: true,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to unregister server: ${error}`
      }
    }
  }

  /**
   * List all registered servers
   */
  private async listRegisteredServers(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { includeOffline = false, category } = params
      
      const servers = this.extension.getRegisteredServers({
        includeOffline,
        category
      })
      
      return {
        success: true,
        result: {
          servers: servers.map(server => ({
            id: server.id,
            name: server.name,
            version: server.version,
            host: server.host,
            port: server.port,
            protocol: server.protocol,
            status: server.status,
            online: server.online,
            category: server.category,
            description: server.description,
            registeredAt: server.registeredAt?.toISOString(),
            lastActivity: server.lastActivity?.toISOString(),
            capabilities: server.capabilities
          })),
          total: servers.length,
          online: servers.filter(s => s.online).length,
          offline: servers.filter(s => !s.online).length,
          categories: [...new Set(servers.map(s => s.category).filter(Boolean))],
          filters: { includeOffline, category }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list servers: ${error}`
      }
    }
  }

  /**
   * Get detailed server information
   */
  private async getServerInfo(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, includeCapabilities = true } = params
      
      if (!serverId) {
        return {
          success: false,
          error: 'Server ID is required'
        }
      }

      const serverInfo = await this.extension.getServerInfo(serverId, {
        includeCapabilities
      })
      
      if (!serverInfo) {
        return {
          success: false,
          error: `Server '${serverId}' not found`
        }
      }

      return {
        success: true,
        result: {
          id: serverInfo.id,
          name: serverInfo.name,
          version: serverInfo.version,
          description: serverInfo.description,
          host: serverInfo.host,
          port: serverInfo.port,
          protocol: serverInfo.protocol,
          status: serverInfo.status,
          online: serverInfo.online,
          category: serverInfo.category,
          registeredAt: serverInfo.registeredAt?.toISOString(),
          lastActivity: serverInfo.lastActivity?.toISOString(),
          connectionInfo: {
            connected: serverInfo.connectionInfo?.connected || false,
            connectionTime: serverInfo.connectionInfo?.connectionTime?.toISOString(),
            lastPing: serverInfo.connectionInfo?.lastPing?.toISOString(),
            responseTime: serverInfo.connectionInfo?.responseTime
          },
          capabilities: includeCapabilities ? serverInfo.capabilities : undefined,
          tools: serverInfo.tools?.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          })),
          resources: serverInfo.resources?.map(resource => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType
          })),
          prompts: serverInfo.prompts?.map(prompt => ({
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments
          })),
          metadata: serverInfo.metadata
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get server info: ${error}`
      }
    }
  }

  /**
   * Scan network for MCP servers
   */
  private async scanNetwork(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { 
        subnet = '192.168.1.0/24', 
        ports = [8080, 8081, 3000, 3001, 4000, 5000], 
        timeout = 2000 
      } = params
      
      const scanResults = await this.extension.scanNetwork({
        subnet,
        ports,
        timeout
      })
      
      return {
        success: true,
        result: {
          hosts: scanResults.hosts.map(host => ({
            ip: host.ip,
            hostname: host.hostname,
            ports: host.ports.map(port => ({
              port: port.port,
              open: port.open,
              service: port.service,
              mcpServer: port.mcpServer,
              responseTime: port.responseTime
            }))
          })),
          mcpServers: scanResults.mcpServers.map(server => ({
            ip: server.ip,
            port: server.port,
            name: server.name,
            version: server.version,
            capabilities: server.capabilities,
            responseTime: server.responseTime
          })),
          scanTime: scanResults.scanTime,
          hostsScanned: scanResults.hostsScanned,
          portsScanned: scanResults.portsScanned,
          serversFound: scanResults.mcpServers.length,
          subnet,
          timeout
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Network scan failed: ${error}`
      }
    }
  }

  /**
   * Validate server configuration
   */
  private async validateServer(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverConfig } = params
      
      if (!serverConfig) {
        return {
          success: false,
          error: 'Server configuration is required'
        }
      }

      const validation = await this.extension.validateServerConfig(serverConfig)
      
      return {
        success: true,
        result: {
          valid: validation.valid,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
          suggestions: validation.suggestions || [],
          connectivity: {
            reachable: validation.connectivity?.reachable || false,
            responseTime: validation.connectivity?.responseTime,
            error: validation.connectivity?.error
          },
          serverInfo: validation.serverInfo,
          capabilities: validation.capabilities,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Server validation failed: ${error}`
      }
    }
  }

  /**
   * Import server configuration
   */
  private async importServerConfig(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { source, format = 'json' } = params
      
      if (!source) {
        return {
          success: false,
          error: 'Source path or URL is required'
        }
      }

      const result = await this.extension.importServerConfig(source, format)
      
      return {
        success: true,
        result: {
          message: `Server configuration imported from '${source}'`,
          serversImported: result.serversImported,
          serversSkipped: result.serversSkipped,
          errors: result.errors || [],
          warnings: result.warnings || [],
          source,
          format,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to import server config: ${error}`
      }
    }
  }

  /**
   * Export server configuration
   */
  private async exportServerConfig(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, destination, format = 'json' } = params
      
      if (!destination) {
        return {
          success: false,
          error: 'Destination path is required'
        }
      }

      const result = await this.extension.exportServerConfig({
        serverId,
        destination,
        format
      })
      
      return {
        success: true,
        result: {
          message: serverId 
            ? `Server '${serverId}' configuration exported to '${destination}'`
            : `All server configurations exported to '${destination}'`,
          serversExported: result.serversExported,
          destination,
          format,
          fileSize: result.fileSize,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to export server config: ${error}`
      }
    }
  }

  /**
   * Update server configuration
   */
  private async updateServerConfig(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { serverId, config } = params
      
      if (!serverId || !config) {
        return {
          success: false,
          error: 'Server ID and configuration are required'
        }
      }

      const result = await this.extension.updateServerConfig(serverId, config)
      
      return {
        success: true,
        result: {
          message: `Server '${serverId}' configuration updated`,
          serverId,
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
        error: `Failed to update server config: ${error}`
      }
    }
  }
}