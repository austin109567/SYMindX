/**
 * MCP Client Skills Index
 * 
 * Exports all MCP client skills and provides initialization function.
 */

import { ClientConnectionSkill } from './client-connection.js'
import { ServerDiscoverySkill } from './server-discovery.js'
import { ToolInvocationSkill } from './tool-invocation.js'
import { ResourceRetrievalSkill } from './resource-retrieval.js'
import { SessionManagementSkill } from './session-management.js'
import { McpClientExtension } from '../index.js'

/**
 * Initialize all MCP client skills
 */
export function initializeSkills(extension: McpClientExtension) {
  return {
    clientConnection: new ClientConnectionSkill(extension),
    serverDiscovery: new ServerDiscoverySkill(extension),
    toolInvocation: new ToolInvocationSkill(extension),
    resourceRetrieval: new ResourceRetrievalSkill(extension),
    sessionManagement: new SessionManagementSkill(extension)
  }
}

// Export all skills
export { ClientConnectionSkill } from './client-connection.js'
export { ServerDiscoverySkill } from './server-discovery.js'
export { ToolInvocationSkill } from './tool-invocation.js'
export { ResourceRetrievalSkill } from './resource-retrieval.js'
export { SessionManagementSkill } from './session-management.js'