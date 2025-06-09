/**
 * Slack Extension Skills
 * 
 * This module exports all the skills available in the Slack extension.
 * Each skill represents a group of related actions that the agent can perform.
 */

import { MessagingSkill } from './messaging.js'
import { ChannelManagementSkill } from './channel-management.js'
import { UserManagementSkill } from './user-management.js'
import { FileManagementSkill } from './file-management.js'
import { WorkflowSkill } from './workflow.js'

export {
  MessagingSkill,
  ChannelManagementSkill,
  UserManagementSkill,
  FileManagementSkill,
  WorkflowSkill
}

/**
 * Initialize all skills with the Slack extension instance
 */
export function initializeSkills(extension: any) {
  return {
    messaging: new MessagingSkill(extension),
    channelManagement: new ChannelManagementSkill(extension),
    userManagement: new UserManagementSkill(extension),
    fileManagement: new FileManagementSkill(extension),
    workflow: new WorkflowSkill(extension)
  }
}