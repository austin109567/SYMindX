/**
 * Multi-Agent Coordination Module
 * 
 * This module provides orchestration capabilities for managing multiple agents,
 * task delegation, inter-agent communication, and conflict resolution.
 */

import { EventEmitter } from 'events'
import {
  AgentHierarchy,
  AgentRole,
  TaskDelegationSystem,
  Task,
  TaskResult,
  TaskStatus,
  CommunicationProtocol,
  AgentMessage,
  AgentFilter,
  MessageHandler
} from '../../extensions/mcp-client/types.js'
import { Agent } from '../../types/agent.js'

export interface CoordinationModule {
  orchestrator: AgentOrchestrator
  taskDelegation: TaskDelegationSystem
  conflictResolution: ConflictResolver
  resourceSharing: ResourceManager
}

export interface AgentOrchestrator {
  agents: Map<string, Agent>
  hierarchy: AgentHierarchy
  taskDelegation: TaskDelegationSystem
  interAgentCommunication: CommunicationProtocol
  addAgent(agent: Agent, role?: AgentRole): Promise<void>
  removeAgent(agentId: string): Promise<void>
  getAgentsByRole(role: string): Agent[]
  getAgentsByCapability(capability: string): Agent[]
  delegateTask(task: Task, criteria?: DelegationCriteria): Promise<TaskResult>
  broadcastMessage(message: AgentMessage, filter?: AgentFilter): Promise<void>
}

export interface DelegationCriteria {
  requiredCapabilities?: string[]
  preferredRoles?: string[]
  excludeAgents?: string[]
  priority?: number
  deadline?: Date
}

export interface ConflictResolver {
  resolveResourceConflict(resource: string, requesters: Agent[]): Promise<string>
  resolveTaskConflict(task: Task, candidates: Agent[]): Promise<string>
  resolvePriorityConflict(tasks: Task[]): Promise<Task[]>
}

export interface ResourceManager {
  allocateResource(resource: string, agentId: string, duration?: number): Promise<boolean>
  releaseResource(resource: string, agentId: string): Promise<void>
  getResourceStatus(resource: string): ResourceStatus
  getAgentResources(agentId: string): string[]
}

export interface ResourceStatus {
  resource: string
  allocated: boolean
  allocatedTo?: string
  allocatedAt?: Date
  expiresAt?: Date
  queue: string[]
}

export class SYMindXOrchestrator implements AgentOrchestrator {
  agents: Map<string, Agent> = new Map()
  hierarchy: AgentHierarchy = {
    root: '',
    children: new Map(),
    parents: new Map(),
    roles: new Map()
  }
  taskDelegation: TaskDelegationSystem
  interAgentCommunication: CommunicationProtocol
  
  private tasks: Map<string, Task> = new Map()
  private taskResults: Map<string, TaskResult> = new Map()
  private eventBus = new EventEmitter()

  constructor() {
    this.taskDelegation = new SYMindXTaskDelegation(this)
    this.interAgentCommunication = new SYMindXCommunication(this)
  }

  async addAgent(agent: Agent, role?: AgentRole): Promise<void> {
    this.agents.set(agent.id, agent)
    
    if (role) {
      this.hierarchy.roles.set(agent.id, role)
    }

    // If this is the first agent, make it root
    if (this.agents.size === 1 && !this.hierarchy.root) {
      this.hierarchy.root = agent.id
    }

    console.log(`🤖 Agent ${agent.id} added to orchestrator`)
    this.eventBus.emit('agent.added', { agentId: agent.id, role })
  }

  async removeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) return

    // Remove from hierarchy
    this.hierarchy.roles.delete(agentId)
    this.hierarchy.parents.delete(agentId)
    
    const children = this.hierarchy.children.get(agentId)
    if (children) {
      // Reassign children to parent or root
      const parent = this.hierarchy.parents.get(agentId) || this.hierarchy.root
      for (const childId of children) {
        this.hierarchy.parents.set(childId, parent)
        const parentChildren = this.hierarchy.children.get(parent) || []
        parentChildren.push(childId)
        this.hierarchy.children.set(parent, parentChildren)
      }
      this.hierarchy.children.delete(agentId)
    }

    // If removing root, assign new root
    if (this.hierarchy.root === agentId) {
      const remainingAgents = Array.from(this.agents.keys()).filter(id => id !== agentId)
      this.hierarchy.root = remainingAgents[0] || ''
    }

    this.agents.delete(agentId)
    console.log(`🤖 Agent ${agentId} removed from orchestrator`)
    this.eventBus.emit('agent.removed', { agentId })
  }

  getAgentsByRole(role: string): Agent[] {
    const agentIds = Array.from(this.hierarchy.roles.entries())
      .filter(([_, agentRole]) => agentRole.name === role)
      .map(([agentId, _]) => agentId)
    
    return agentIds.map(id => this.agents.get(id)!).filter(Boolean)
  }

  getAgentsByCapability(capability: string): Agent[] {
    const agentIds = Array.from(this.hierarchy.roles.entries())
      .filter(([_, role]) => role.capabilities.includes(capability))
      .map(([agentId, _]) => agentId)
    
    return agentIds.map(id => this.agents.get(id)!).filter(Boolean)
  }

  async delegateTask(task: Task, criteria?: DelegationCriteria): Promise<TaskResult> {
    return await this.taskDelegation.delegate(task, '', criteria?.preferredRoles?.[0] || '')
  }

  async broadcastMessage(message: AgentMessage, filter?: AgentFilter): Promise<void> {
    await this.interAgentCommunication.broadcast(message.from, message, filter)
  }

  // Utility methods
  getHierarchyDepth(agentId: string): number {
    let depth = 0
    let currentId = agentId
    
    while (this.hierarchy.parents.has(currentId)) {
      currentId = this.hierarchy.parents.get(currentId)!
      depth++
      if (depth > 100) break // Prevent infinite loops
    }
    
    return depth
  }

  getAgentSubordinates(agentId: string): string[] {
    const subordinates: string[] = []
    const children = this.hierarchy.children.get(agentId) || []
    
    for (const childId of children) {
      subordinates.push(childId)
      subordinates.push(...this.getAgentSubordinates(childId))
    }
    
    return subordinates
  }

  canAgentDelegate(fromAgentId: string, toAgentId: string): boolean {
    const fromRole = this.hierarchy.roles.get(fromAgentId)
    const toRole = this.hierarchy.roles.get(toAgentId)
    
    if (!fromRole || !toRole) return false
    
    // Check if fromAgent has higher priority or is a parent
    const isParent = this.hierarchy.children.get(fromAgentId)?.includes(toAgentId)
    const hasHigherPriority = fromRole.priority > toRole.priority
    
    return isParent || hasHigherPriority
  }
}

export class SYMindXTaskDelegation implements TaskDelegationSystem {
  private orchestrator: SYMindXOrchestrator
  private taskQueue: Map<string, Task[]> = new Map()
  private activeAssignments: Map<string, string> = new Map() // taskId -> agentId

  constructor(orchestrator: SYMindXOrchestrator) {
    this.orchestrator = orchestrator
  }

  async delegate(task: Task, fromAgent: string, toAgent: string): Promise<TaskResult> {
    // Find best agent if toAgent not specified
    if (!toAgent) {
      toAgent = this.findBestAgent(task)
    }

    if (!this.canDelegate(task, fromAgent, toAgent)) {
      throw new Error(`Cannot delegate task ${task.id} from ${fromAgent} to ${toAgent}`)
    }

    // Assign task
    task.assignedTo = toAgent
    task.status = TaskStatus.ASSIGNED
    this.activeAssignments.set(task.id, toAgent)

    // Add to agent's queue
    const agentQueue = this.taskQueue.get(toAgent) || []
    agentQueue.push(task)
    this.taskQueue.set(toAgent, agentQueue)

    console.log(`📋 Task ${task.id} delegated from ${fromAgent} to ${toAgent}`)

    // Execute task (simplified - in reality this would be more complex)
    const startTime = Date.now()
    try {
      task.status = TaskStatus.IN_PROGRESS
      
      // Simulate task execution
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      task.status = TaskStatus.COMPLETED
      const result: TaskResult = {
        taskId: task.id,
        success: true,
        result: `Task ${task.id} completed successfully`,
        duration: Date.now() - startTime,
        agentId: toAgent
      }

      // Remove from active assignments
      this.activeAssignments.delete(task.id)
      
      // Remove from queue
      const queue = this.taskQueue.get(toAgent) || []
      const index = queue.findIndex(t => t.id === task.id)
      if (index >= 0) {
        queue.splice(index, 1)
        this.taskQueue.set(toAgent, queue)
      }

      return result
    } catch (error) {
      task.status = TaskStatus.FAILED
      const result: TaskResult = {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        agentId: toAgent
      }

      this.activeAssignments.delete(task.id)
      return result
    }
  }

  canDelegate(task: Task, fromAgent: string, toAgent: string): boolean {
    // Check if agents exist
    if (!this.orchestrator.agents.has(fromAgent) || !this.orchestrator.agents.has(toAgent)) {
      return false
    }

    // Check hierarchy permissions
    if (!this.orchestrator.canAgentDelegate(fromAgent, toAgent)) {
      return false
    }

    // Check if target agent has required capabilities
    const toRole = this.orchestrator.hierarchy.roles.get(toAgent)
    if (toRole && task.dependencies.length > 0) {
      const hasRequiredCapabilities = task.dependencies.every(dep => 
        toRole.capabilities.includes(dep)
      )
      if (!hasRequiredCapabilities) {
        return false
      }
    }

    return true
  }

  getAvailableAgents(task: Task): string[] {
    return Array.from(this.orchestrator.agents.keys()).filter(agentId => {
      const role = this.orchestrator.hierarchy.roles.get(agentId)
      if (!role) return false

      // Check capabilities
      const hasCapabilities = task.dependencies.every(dep => 
        role.capabilities.includes(dep)
      )

      // Check availability (not overloaded)
      const agentQueue = this.taskQueue.get(agentId) || []
      const isAvailable = agentQueue.length < 5 // Max 5 tasks per agent

      return hasCapabilities && isAvailable
    })
  }

  private findBestAgent(task: Task): string {
    const availableAgents = this.getAvailableAgents(task)
    
    if (availableAgents.length === 0) {
      throw new Error(`No available agents for task ${task.id}`)
    }

    // Score agents based on capabilities, priority, and current load
    const scoredAgents = availableAgents.map(agentId => {
      const role = this.orchestrator.hierarchy.roles.get(agentId)!
      const queue = this.taskQueue.get(agentId) || []
      
      let score = role.priority * 10 // Base score from priority
      score -= queue.length * 2 // Penalty for current load
      
      // Bonus for exact capability match
      const exactMatches = task.dependencies.filter(dep => 
        role.capabilities.includes(dep)
      ).length
      score += exactMatches * 5

      return { agentId, score }
    })

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score)
    
    return scoredAgents[0].agentId
  }
}

export class SYMindXCommunication implements CommunicationProtocol {
  private orchestrator: SYMindXOrchestrator
  private messageHandlers: Map<string, Map<string, MessageHandler[]>> = new Map()
  private messageHistory: AgentMessage[] = []
  private maxHistorySize = 1000

  constructor(orchestrator: SYMindXOrchestrator) {
    this.orchestrator = orchestrator
  }

  async sendMessage(fromAgent: string, toAgent: string, message: AgentMessage): Promise<void> {
    if (!this.orchestrator.agents.has(fromAgent) || !this.orchestrator.agents.has(toAgent)) {
      throw new Error(`Invalid agent IDs: ${fromAgent} -> ${toAgent}`)
    }

    message.from = fromAgent
    message.to = toAgent
    message.timestamp = new Date()

    // Store in history
    this.addToHistory(message)

    // Deliver to target agent
    const handlers = this.messageHandlers.get(toAgent)?.get(message.type) || []
    for (const handler of handlers) {
      try {
        await handler(message)
      } catch (error) {
        console.error(`Error handling message ${message.id}:`, error)
      }
    }

    console.log(`💬 Message sent from ${fromAgent} to ${toAgent}: ${message.type}`)
  }

  async broadcast(fromAgent: string, message: AgentMessage, filter?: AgentFilter): Promise<void> {
    const targetAgents = this.getFilteredAgents(filter)
    
    message.from = fromAgent
    message.timestamp = new Date()
    
    // Store in history
    this.addToHistory(message)

    // Send to all target agents
    const promises = targetAgents.map(async (agentId) => {
      if (agentId === fromAgent) return // Don't send to self
      
      const handlers = this.messageHandlers.get(agentId)?.get(message.type) || []
      for (const handler of handlers) {
        try {
          await handler({ ...message, to: agentId })
        } catch (error) {
          console.error(`Error broadcasting message ${message.id} to ${agentId}:`, error)
        }
      }
    })

    await Promise.all(promises)
    console.log(`📢 Message broadcast from ${fromAgent} to ${targetAgents.length} agents: ${message.type}`)
  }

  subscribe(agentId: string, messageType: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(agentId)) {
      this.messageHandlers.set(agentId, new Map())
    }
    
    const agentHandlers = this.messageHandlers.get(agentId)!
    if (!agentHandlers.has(messageType)) {
      agentHandlers.set(messageType, [])
    }
    
    agentHandlers.get(messageType)!.push(handler)
    console.log(`📝 Agent ${agentId} subscribed to message type: ${messageType}`)
  }

  private getFilteredAgents(filter?: AgentFilter): string[] {
    let agents = Array.from(this.orchestrator.agents.keys())

    if (!filter) return agents

    if (filter.roles) {
      agents = agents.filter(agentId => {
        const role = this.orchestrator.hierarchy.roles.get(agentId)
        return role && filter.roles!.includes(role.name)
      })
    }

    if (filter.capabilities) {
      agents = agents.filter(agentId => {
        const role = this.orchestrator.hierarchy.roles.get(agentId)
        return role && filter.capabilities!.some(cap => role.capabilities.includes(cap))
      })
    }

    if (filter.status) {
      agents = agents.filter(agentId => {
        const agent = this.orchestrator.agents.get(agentId)
        return agent && filter.status!.includes(agent.status)
      })
    }

    if (filter.exclude) {
      agents = agents.filter(agentId => !filter.exclude!.includes(agentId))
    }

    return agents
  }

  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message)
    
    // Trim history if too large
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize)
    }
  }

  getMessageHistory(agentId?: string, messageType?: string, limit = 50): AgentMessage[] {
    let messages = this.messageHistory

    if (agentId) {
      messages = messages.filter(m => m.from === agentId || m.to === agentId)
    }

    if (messageType) {
      messages = messages.filter(m => m.type === messageType)
    }

    return messages.slice(-limit)
  }
}

export class SYMindXConflictResolver implements ConflictResolver {
  async resolveResourceConflict(resource: string, requesters: Agent[]): Promise<string> {
    // Simple priority-based resolution
    // In a real implementation, this could be more sophisticated
    
    if (requesters.length === 0) {
      throw new Error('No requesters provided')
    }

    if (requesters.length === 1) {
      return requesters[0].id
    }

    // Implement sophisticated conflict resolution based on multiple factors
    let bestRequester = requesters[0]
    let bestScore = 0
    
    for (const requester of requesters) {
      let score = 0
      
      // Factor 1: Agent priority (higher is better)
      score += ((requester as any).priority || 0.5) * 30
      
      // Factor 2: Current workload (lower is better)
      const workload = (requester as any).currentTasks?.length || 0
      score += Math.max(0, 20 - workload * 2)
      
      // Factor 3: Capability match for the resource
      const capabilities = (requester as any).capabilities || []
      const resourceType = (resource as any).type || 'generic'
      if (capabilities.includes(resourceType)) {
        score += 25
      }
      
      // Factor 4: Recent success rate
      const successRate = (requester as any).metrics?.successRate || 0.5
      score += successRate * 15
      
      // Factor 5: Time since last resource access (fairness)
      const lastAccess = (requester as any).lastResourceAccess || 0
      const timeSinceAccess = Date.now() - lastAccess
      score += Math.min(timeSinceAccess / (1000 * 60), 10) // Max 10 points for 1+ minutes
      
      if (score > bestScore) {
        bestScore = score
        bestRequester = requester
      }
    }
    
    return bestRequester.id
  }

  async resolveTaskConflict(task: Task, candidates: Agent[]): Promise<string> {
    // Simple capability-based resolution
    if (candidates.length === 0) {
      throw new Error('No candidates provided')
    }

    if (candidates.length === 1) {
      return candidates[0].id
    }

    // Implement sophisticated task assignment based on agent capabilities and load
    let bestCandidate = candidates[0]
    let bestScore = 0
    
    for (const candidate of candidates) {
      let score = 0
      
      // Get agent information (this would need to be passed in or retrieved)
      // For now, we'll use a simplified scoring system
      
      // Factor 1: Task type compatibility
      const taskType = task.type || 'generic'
      // Assume we can get agent capabilities somehow
      score += 20 // Base compatibility score
      
      // Factor 2: Current workload (prefer less busy agents)
      // This would need access to agent's current task count
      score += 15 // Simplified workload score
      
      // Factor 3: Task priority alignment
      const taskPriority = task.priority || 0.5
      score += taskPriority * 20
      
      // Factor 4: Agent specialization
      // Check if agent has specific skills for this task
      if ((task as any).requiredCapabilities) {
        // Assume agent has capabilities - in real implementation,
        // we'd check against actual agent capabilities
        score += 25
      }
      
      // Factor 5: Geographic/logical proximity
      // For distributed systems, consider agent location
      score += 10 // Simplified proximity score
      
      // Factor 6: Historical performance on similar tasks
      // This would use agent metrics and task history
      score += 10 // Simplified performance score
      
      if (score > bestScore) {
        bestScore = score
        bestCandidate = candidate
      }
    }
    
    return bestCandidate.id
  }

  async resolvePriorityConflict(tasks: Task[]): Promise<Task[]> {
    // Sort by priority (higher first), then by deadline
    return tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime()
      }
      
      if (a.deadline && !b.deadline) return -1
      if (!a.deadline && b.deadline) return 1
      
      return 0
    })
  }
}

export class SYMindXResourceManager implements ResourceManager {
  private allocations: Map<string, ResourceStatus> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()

  async allocateResource(resource: string, agentId: string, duration?: number): Promise<boolean> {
    const status = this.allocations.get(resource)
    
    if (!status) {
      // Resource not tracked yet, create new allocation
      const newStatus: ResourceStatus = {
        resource,
        allocated: true,
        allocatedTo: agentId,
        allocatedAt: new Date(),
        expiresAt: duration ? new Date(Date.now() + duration) : undefined,
        queue: []
      }
      
      this.allocations.set(resource, newStatus)
      
      if (duration) {
        const timer = setTimeout(() => {
          this.releaseResource(resource, agentId)
        }, duration)
        this.timers.set(`${resource}:${agentId}`, timer)
      }
      
      console.log(`🔒 Resource ${resource} allocated to ${agentId}`)
      return true
    }
    
    if (status.allocated) {
      // Resource already allocated, add to queue
      if (!status.queue.includes(agentId)) {
        status.queue.push(agentId)
        console.log(`⏳ Agent ${agentId} queued for resource ${resource}`)
      }
      return false
    }
    
    // Resource available, allocate it
    status.allocated = true
    status.allocatedTo = agentId
    status.allocatedAt = new Date()
    status.expiresAt = duration ? new Date(Date.now() + duration) : undefined
    
    if (duration) {
      const timer = setTimeout(() => {
        this.releaseResource(resource, agentId)
      }, duration)
      this.timers.set(`${resource}:${agentId}`, timer)
    }
    
    console.log(`🔒 Resource ${resource} allocated to ${agentId}`)
    return true
  }

  async releaseResource(resource: string, agentId: string): Promise<void> {
    const status = this.allocations.get(resource)
    if (!status || status.allocatedTo !== agentId) {
      return
    }
    
    // Clear timer
    const timerKey = `${resource}:${agentId}`
    const timer = this.timers.get(timerKey)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(timerKey)
    }
    
    // Release resource
    status.allocated = false
    status.allocatedTo = undefined
    status.allocatedAt = undefined
    status.expiresAt = undefined
    
    console.log(`🔓 Resource ${resource} released by ${agentId}`)
    
    // Allocate to next in queue
    if (status.queue.length > 0) {
      const nextAgentId = status.queue.shift()!
      await this.allocateResource(resource, nextAgentId)
    }
  }

  getResourceStatus(resource: string): ResourceStatus {
    return this.allocations.get(resource) || {
      resource,
      allocated: false,
      queue: []
    }
  }

  getAgentResources(agentId: string): string[] {
    return Array.from(this.allocations.entries())
      .filter(([_, status]) => status.allocatedTo === agentId)
      .map(([resource, _]) => resource)
  }
}

// Factory function to create coordination module
export function createCoordinationModule(): CoordinationModule {
  const orchestrator = new SYMindXOrchestrator()
  
  return {
    orchestrator,
    taskDelegation: orchestrator.taskDelegation,
    conflictResolution: new SYMindXConflictResolver(),
    resourceSharing: new SYMindXResourceManager()
  }
}