/**
 * Sad Emotion Module for SYMindX
 * 
 * This module implements sad emotions with various triggers and behaviors
 */

import { EmotionState, EmotionConfig } from '../../../../types/agent.js'
import { BaseEmotionModule } from '../../base-emotion-module.js'
import { EmotionModuleMetadata } from '../../../../types/emotion.js'

// Sad emotion definition
export const SAD_EMOTIONS = {
  melancholy: { intensity: 0.5, triggers: ['loss', 'memory', 'nostalgia'], color: '#6A5ACD' },
  disappointed: { intensity: 0.6, triggers: ['failure', 'letdown', 'unmet_expectation'], color: '#708090' },
  lonely: { intensity: 0.7, triggers: ['isolation', 'rejection', 'abandonment'], color: '#4682B4' },
  regretful: { intensity: 0.6, triggers: ['mistake', 'missed_opportunity', 'wrong_choice'], color: '#5F9EA0' },
  grieving: { intensity: 0.9, triggers: ['death', 'major_loss', 'ending'], color: '#2F4F4F' },
  hopeless: { intensity: 0.8, triggers: ['failure', 'despair', 'helplessness'], color: '#4B0082' },
  guilty: { intensity: 0.7, triggers: ['wrongdoing', 'harm', 'betrayal'], color: '#483D8B' },
  homesick: { intensity: 0.5, triggers: ['away', 'distance', 'unfamiliar'], color: '#87CEEB' },
}

export type SadEmotion = keyof typeof SAD_EMOTIONS

/**
 * Sad emotion module implementation
 */
export class SadEmotionModule extends BaseEmotionModule {
  private sadEmotions: typeof SAD_EMOTIONS
  private currentSadEmotion: SadEmotion = 'melancholy'

  constructor(config: EmotionConfig) {
    const metadata: EmotionModuleMetadata = {
      id: 'sad',
      name: 'Sad Emotions',
      description: 'A module for negative emotions like melancholy, disappointment, and loneliness',
      version: '1.0.0',
      author: 'SYMindX Team'
    }
    
    super(config, metadata)
    this.sadEmotions = SAD_EMOTIONS
    this.currentEmotion = 'melancholy' // Default sad emotion
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
      triggers: this.sadEmotions[this.currentSadEmotion as SadEmotion]?.triggers || [],
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
  private findTriggeredEmotions(eventType: string, context: Record<string, any>): SadEmotion[] {
    const triggered: SadEmotion[] = []
    
    for (const [emotion, data] of Object.entries(this.sadEmotions)) {
      if (data.triggers.some(trigger => 
        eventType.includes(trigger) || 
        Object.keys(context).some(key => key.includes(trigger))
      )) {
        triggered.push(emotion as SadEmotion)
      }
    }

    // Special context-based triggers
    if (context.failure) triggered.push('disappointed', 'hopeless')
    if (context.alone && context.duration > 60) triggered.push('lonely')
    if (context.mistake) triggered.push('regretful', 'guilty')
    if (context.loss && context.importance > 0.7) triggered.push('grieving')
    if (context.far_from_home) triggered.push('homesick')

    return triggered.filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
  }

  /**
   * Select the dominant emotion from candidates
   * @param candidates Array of candidate emotions
   * @returns The dominant emotion
   */
  private selectDominantEmotion(candidates: SadEmotion[]): SadEmotion {
    if (candidates.length === 0) return 'melancholy'
    if (candidates.length === 1) return candidates[0]

    // Emotion priority system
    const priorities: Record<SadEmotion, number> = {
      grieving: 10,
      hopeless: 9,
      lonely: 8,
      guilty: 7,
      regretful: 6,
      disappointed: 5,
      homesick: 4,
      melancholy: 3
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
  private transitionToEmotion(newEmotion: SadEmotion, triggers: SadEmotion[]): void {
    const emotionData = this.sadEmotions[newEmotion]
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
    if (newEmotion !== this.currentSadEmotion || Math.abs(this._intensity - newIntensity) > 0.1) {
      this.recordEmotionChange(newEmotion, triggers.map(t => t.toString()))
      this.currentSadEmotion = newEmotion
      this.currentEmotion = newEmotion
    }
    
    this.lastUpdate = new Date()
  }

  /**
   * Get the color associated with the current emotion
   * @returns Color hex code
   */
  getEmotionColor(): string {
    return this.sadEmotions[this.currentSadEmotion]?.color || '#FFFFFF'
  }

  /**
   * Get modifiers that this emotion applies to behavior
   * @returns Record of modifiers
   */
  getEmotionModifier(): Record<string, number> {
    const modifiers: Record<SadEmotion, Record<string, number>> = {
      melancholy: { creativity: 1.2, energy: 0.8, social: 0.9 },
      disappointed: { motivation: 0.7, optimism: 0.6, trust: 0.8 },
      lonely: { social: 0.6, focus: 0.8, need_connection: 1.5 },
      regretful: { caution: 1.3, risk_taking: 0.6, reflection: 1.4 },
      grieving: { energy: 0.5, focus: 0.6, emotional_processing: 1.5 },
      hopeless: { motivation: 0.4, creativity: 0.7, persistence: 0.5 },
      guilty: { self_criticism: 1.5, generosity: 1.3, caution: 1.2 },
      homesick: { nostalgia: 1.4, appreciation: 1.2, comfort_seeking: 1.3 }
    }

    const baseModifiers = modifiers[this.currentSadEmotion] || {}
    const scaledModifiers: Record<string, number> = {}
    
    // Scale modifiers by intensity
    for (const [key, value] of Object.entries(baseModifiers)) {
      const scaledValue = 1 + (value - 1) * this.intensity
      scaledModifiers[key] = scaledValue
    }
    
    return scaledModifiers
  }
}

// Factory function to create a sad emotion module
export function createSadEmotionModule(config: EmotionConfig): SadEmotionModule {
  return new SadEmotionModule(config)
}