/**
 * Angry Emotion Module for SYMindX
 * 
 * This module implements angry emotions with various triggers and behaviors
 */

import { EmotionState, EmotionConfig } from '../../../../types/agent.js'
import { BaseEmotionModule } from '../../base-emotion-module.js'
import { EmotionModuleMetadata } from '../../../../types/emotion.js'

// Angry emotion definition
export const ANGRY_EMOTIONS = {
  irritated: { intensity: 0.4, triggers: ['annoyance', 'disturbance', 'interruption'], color: '#FFA07A' },
  frustrated: { intensity: 0.6, triggers: ['obstacle', 'failure', 'limitation'], color: '#CD5C5C' },
  indignant: { intensity: 0.7, triggers: ['injustice', 'unfairness', 'disrespect'], color: '#B22222' },
  outraged: { intensity: 0.9, triggers: ['violation', 'betrayal', 'abuse'], color: '#8B0000' },
  resentful: { intensity: 0.5, triggers: ['mistreatment', 'neglect', 'favoritism'], color: '#A52A2A' },
  vengeful: { intensity: 0.8, triggers: ['revenge', 'payback', 'justice'], color: '#800000' },
  contemptuous: { intensity: 0.6, triggers: ['disrespect', 'superiority', 'disgust'], color: '#A0522D' },
  enraged: { intensity: 1.0, triggers: ['threat', 'attack', 'extreme_violation'], color: '#FF0000' },
}

export type AngryEmotion = keyof typeof ANGRY_EMOTIONS

/**
 * Angry emotion module implementation
 */
export class AngryEmotionModule extends BaseEmotionModule {
  private angryEmotions: typeof ANGRY_EMOTIONS
  private currentAngryEmotion: AngryEmotion = 'irritated'

  constructor(config: EmotionConfig) {
    const metadata: EmotionModuleMetadata = {
      id: 'angry',
      name: 'Angry Emotions',
      description: 'A module for anger-related emotions like frustration, indignation, and rage',
      version: '1.0.0',
      author: 'SYMindX Team'
    }
    
    super(config, metadata)
    this.angryEmotions = ANGRY_EMOTIONS
    this.currentEmotion = 'irritated' // Default angry emotion
  }

  /**
   * Process an event and update the emotion state
   * @param eventType The type of event that occurred
   * @param context Additional context about the event
   * @returns The updated emotion state
   */
  processEvent(eventType: string, context: Record<string, any> = {}): EmotionState {
    const triggers = this.findTriggeredEmotions(eventType, context)
    
    if (triggers.length > 0) {
      const newEmotion = this.selectDominantEmotion(triggers)
      this.transitionToEmotion(newEmotion, triggers)
    } else {
      this.decayCurrentEmotion()
    }

    return this.getCurrentState()
  }

  /**
   * Get the current emotion state
   * @returns The current emotion state
   */
  getCurrentState(): EmotionState {
    return {
      current: this.currentEmotion,
      intensity: this.intensity,
      triggers: this.angryEmotions[this.currentAngryEmotion as AngryEmotion]?.triggers || [],
      history: [...this.emotionHistory],
      timestamp: new Date()
    }
  }

  /**
   * Find emotions that are triggered by the event
   * @param eventType The type of event
   * @param context Additional context
   * @returns Array of triggered emotions
   */
  private findTriggeredEmotions(eventType: string, context: Record<string, any>): AngryEmotion[] {
    const triggered: AngryEmotion[] = []
    
    for (const [emotion, data] of Object.entries(this.angryEmotions)) {
      if (data.triggers.some(trigger => 
        eventType.includes(trigger) || 
        Object.keys(context).some(key => key.includes(trigger))
      )) {
        triggered.push(emotion as AngryEmotion)
      }
    }

    // Special context-based triggers
    if (context.blocked) triggered.push('frustrated')
    if (context.disrespected) triggered.push('indignant', 'contemptuous')
    if (context.betrayed) triggered.push('outraged', 'vengeful')
    if (context.attacked) triggered.push('enraged')
    if (context.unfair_treatment) triggered.push('resentful', 'indignant')
    if (context.repeated_annoyance) triggered.push('irritated', 'frustrated')

    return triggered.filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
  }

  /**
   * Select the dominant emotion from candidates
   * @param candidates Array of candidate emotions
   * @returns The dominant emotion
   */
  private selectDominantEmotion(candidates: AngryEmotion[]): AngryEmotion {
    if (candidates.length === 0) return 'irritated'
    if (candidates.length === 1) return candidates[0]

    // Emotion priority system
    const priorities: Record<AngryEmotion, number> = {
      enraged: 10,
      outraged: 9,
      vengeful: 8,
      indignant: 7,
      frustrated: 6,
      contemptuous: 5,
      resentful: 4,
      irritated: 3
    }

    // Select emotion with highest priority, with some randomness
    const weighted = candidates.map(emotion => ({
      emotion,
      weight: priorities[emotion] + Math.random() * 2
    }))

    weighted.sort((a, b) => b.weight - a.weight)
    return weighted[0].emotion
  }

  /**
   * Transition to a new emotion
   * @param newEmotion The new emotion
   * @param triggers What triggered this emotion
   */
  private transitionToEmotion(newEmotion: AngryEmotion, triggers: AngryEmotion[]): void {
    const emotionData = this.angryEmotions[newEmotion]
    const baseIntensity = emotionData.intensity
    
    // Adjust intensity based on sensitivity and current state
    let newIntensity = baseIntensity * this.config.sensitivity
    
    // Amplify if multiple triggers
    if (triggers.length > 1) {
      newIntensity = Math.min(1.0, newIntensity * (1 + triggers.length * 0.1))
    }
    
    // Smooth transition based on transition speed
    const transitionFactor = this.config.transitionSpeed
    this._intensity = this._intensity * (1 - transitionFactor) + newIntensity * transitionFactor
    
    // Record emotion change if significant
    if (newEmotion !== this.currentAngryEmotion || Math.abs(this._intensity - newIntensity) > 0.1) {
      this.recordEmotionChange(newEmotion, triggers.map(t => t.toString()))
      this.currentAngryEmotion = newEmotion
      this.currentEmotion = newEmotion
    }
    
    this.lastUpdate = new Date()
  }

  /**
   * Get the color associated with the current emotion
   * @returns Color hex code
   */
  getEmotionColor(): string {
    return this.angryEmotions[this.currentAngryEmotion]?.color || '#FFFFFF'
  }

  /**
   * Get modifiers that this emotion applies to behavior
   * @returns Record of modifiers
   */
  getEmotionModifier(): Record<string, number> {
    const modifiers: Record<AngryEmotion, Record<string, number>> = {
      irritated: { patience: 0.8, focus: 0.9, aggression: 1.1 },
      frustrated: { persistence: 1.2, aggression: 1.2, patience: 0.7 },
      indignant: { assertiveness: 1.3, social: 0.8, justice_seeking: 1.4 },
      outraged: { aggression: 1.5, restraint: 0.6, justice_seeking: 1.6 },
      resentful: { trust: 0.6, cooperation: 0.7, memory: 1.2 },
      vengeful: { planning: 1.3, patience: 1.2, forgiveness: 0.3 },
      contemptuous: { empathy: 0.5, cooperation: 0.6, criticism: 1.4 },
      enraged: { aggression: 1.8, restraint: 0.4, strength: 1.3 }
    }

    const baseModifiers = modifiers[this.currentAngryEmotion] || {}
    const scaledModifiers: Record<string, number> = {}
    
    // Scale modifiers by intensity
    for (const [key, value] of Object.entries(baseModifiers)) {
      const scaledValue = 1 + (value - 1) * this.intensity
      scaledModifiers[key] = scaledValue
    }
    
    return scaledModifiers
  }
}

// Factory function to create an angry emotion module
export function createAngryEmotionModule(config: EmotionConfig): AngryEmotionModule {
  return new AngryEmotionModule(config)
}