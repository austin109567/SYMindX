/**
 * Portal Integration
 * 
 * This module provides functions to integrate portals with the SYMindX runtime.
 */

import { ModuleRegistry } from '../types/agent.js'
import { Portal, PortalConfig, PortalCapability } from '../types/portal.js'
import { PortalRegistry, createPortal, getAvailablePortals, getPortalDefaultConfig } from './index.js'

/**
 * Register all available portals with the runtime
 * @param registry The module registry to register portals with
 * @param apiKeys Optional map of API keys for each portal
 */
export async function registerPortals(
  registry: ModuleRegistry,
  apiKeys: Record<string, string> = {}
): Promise<void> {
  console.log('🔮 Registering portals with runtime...')
  
  const portalRegistry = PortalRegistry.getInstance()
  const availablePortals = getAvailablePortals()
  
  let registeredCount = 0
  
  for (const portalName of availablePortals) {
    try {
      // Get default config and override with provided API key if available
      const defaultConfig = getPortalDefaultConfig(portalName)
      const config: PortalConfig = {
        ...defaultConfig,
        apiKey: apiKeys[portalName] || process.env[`${portalName.toUpperCase()}_API_KEY`] || defaultConfig.apiKey
      }
      
      // Skip if no API key is available
      if (!config.apiKey) {
        console.warn(`⚠️ Skipping portal ${portalName}: No API key provided`)
        continue
      }
      
      // Create and register the portal
      const portal = createPortal(portalName, config)
      registry.registerPortal(portalName, portal)
      registeredCount++
      
      console.log(`✅ Registered portal: ${portalName}`)
    } catch (error) {
      console.warn(`⚠️ Failed to register portal ${portalName}:`, (error as Error).message)
    }
  }
  
  console.log(`✅ Registered ${registeredCount}/${availablePortals.length} portals`)
}

/**
 * Initialize a portal for an agent
 * @param portal The portal to initialize
 * @param agent The agent to initialize the portal with
 */
export async function initializePortal(
  portal: Portal,
  agent: any
): Promise<void> {
  if (!portal.enabled) {
    try {
      await portal.init(agent)
      portal.enabled = true
      console.log(`✅ Initialized portal: ${portal.name} for agent ${agent.name}`)
    } catch (error) {
      console.error(`❌ Failed to initialize portal for ${agent.name}:`, (error as Error).message)
      throw error
    }
  }
}

/**
 * Get a list of available portals with their capabilities
 */
export function getPortalCapabilities(): Array<{ name: string, capabilities: string[] }> {
  const portalRegistry = PortalRegistry.getInstance()
  const availablePortals = getAvailablePortals()
  
  return availablePortals.map(name => {
    try {
      const config = getPortalDefaultConfig(name)
      const portal = createPortal(name, config)
      
      // Get capabilities
      const capabilities = [
        portal.hasCapability(PortalCapability.TEXT_GENERATION) ? 'text_generation' : null,
        portal.hasCapability(PortalCapability.CHAT_GENERATION) ? 'chat_generation' : null,
        portal.hasCapability(PortalCapability.EMBEDDING_GENERATION) ? 'embedding_generation' : null,
        portal.hasCapability(PortalCapability.IMAGE_GENERATION) ? 'image_generation' : null,
        portal.hasCapability(PortalCapability.STREAMING) ? 'streaming' : null,
        portal.hasCapability(PortalCapability.FUNCTION_CALLING) ? 'function_calling' : null,
        portal.hasCapability(PortalCapability.VISION) ? 'vision' : null,
        portal.hasCapability(PortalCapability.AUDIO) ? 'audio' : null
      ].filter(Boolean) as string[]
      
      return { name, capabilities }
    } catch (error) {
      return { name, capabilities: [] }
    }
  })
}