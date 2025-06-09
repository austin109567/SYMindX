/**
 * MCP Extension Skills
 * 
 * This module exports all MCP-related skills and provides initialization functionality.
 */

import { McpExtension } from '../index.js'
import { ServerManagementSkill } from './server-management.js'
import { ToolExecutionSkill } from './tool-execution.js'
import { ResourceAccessSkill } from './resource-access.js'
import { PromptManagementSkill } from './prompt-management.js'
import { ConnectionMonitoringSkill } from './connection-monitoring.js'

/**
 * Initialize all MCP skills
 * @param extension - The MCP extension instance
 * @returns Object containing all initialized skills
 */
export function initializeSkills(extension: McpExtension): Record<string, any> {
  const skills = {
    serverManagement: new ServerManagementSkill(extension),
    toolExecution: new ToolExecutionSkill(extension),
    resourceAccess: new ResourceAccessSkill(extension),
    promptManagement: new PromptManagementSkill(extension),
    connectionMonitoring: new ConnectionMonitoringSkill(extension)
  }

  console.log('🎯 MCP Skills initialized:', Object.keys(skills))
  return skills
}

// Export individual skills
export {
  ServerManagementSkill,
  ToolExecutionSkill,
  ResourceAccessSkill,
  PromptManagementSkill,
  ConnectionMonitoringSkill
}