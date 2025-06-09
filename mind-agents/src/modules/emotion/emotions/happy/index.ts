/**
 * Happy Emotion Module for SYMindX
 * 
 * This module implements a happy emotion with various triggers and behaviors
 */

import { EmotionState, EmotionConfig } from '../../../../types/agent.js'
import { BaseEmotionModule } from '../../base-emotion-module.js'
import { EmotionModuleMetadata } from '../../../../types/emotion.js'

// Happy emotion definition
export const HAPPY_EMOTIONS = {
  joyful: { intensity: 0.8, triggers: ['achievement', 'success', 'reward'], color: '#FFD700' },
  content: { intensity: 0.5, triggers: ['relaxation', 'comfort', 'satisfaction'], color: '#90EE90' },
  excited: { intensity: 0.9, triggers: ['surprise', 'anticipation', 'discovery'], color: '#FF9800' },
  grateful: { intensity: 0.6, triggers: ['gift', 'help', 'appreciation'], color: '#87CEEB' },
  amused: { intensity: 0.7, triggers: ['humor', 'play', 'entertainment'], color: '#FF69B4' },
  proud: { intensity: 0.8, triggers: ['accomplishment', 'recognition', 'mastery'], color: '#9370DB' },
  hopeful: { intensity: 0.6, triggers: ['opportunity', 'possibility', 'improvement'], color: '#00CED1' },
  peaceful: { intensity: 0.4, triggers: ['tranquility', 'harmony', 'balance'], color: '#AFEEEE' },
}

export type HappyEmotion = keyof typeof HAPPY_EMOTIONS

/**
 * Happy emotion module implementation
 */
export class HappyEmotionModule extends BaseEmotionModule {
  private happyEmotions: typeof HAPPY_EMOTIONS
  private currentHappyEmotion: HappyEmotion = 'content'

  constructor(config: EmotionConfig) {
    const metadata: EmotionModuleMetadata = {
      id: 'happy',
      name: 'Happy Emotions',
      description: 'A module for positive emotions like joy, contentment, and excitement',
      version: '1.0.0',
      author: 'SYMindX Team'
    }
    
    super(config, metadata)
    this.happyEmotions = HAPPY_EMOTIONS
    this.currentEmotion = 'content' // Default happy emotion
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
      triggers: this.happyEmotions[this.currentHappyEmotion as HappyEmotion]?.triggers || [],
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
  private findTriggeredEmotions(eventType: string, context: Record<string, any>): HappyEmotion[] {
    const triggered: HappyEmotion[] = []
    
    for (const [emotion, data] of Object.entries(this.happyEmotions)) {
      if (data.triggers.some(trigger => 
        eventType.includes(trigger) || 
        Object.keys(context).some(key => key.includes(trigger))
      )) {
        triggered.push(emotion as HappyEmotion)
      }
    }

    // Special context-based triggers
    if (context.achievement) triggered.push('proud', 'joyful')
    if (context.reward && context.reward > 100) triggered.push('excited', 'grateful')
    if (context.humor_level && context.humor_level > 0.5) triggered.push('amused')
    if (context.relaxation) triggered.push('peaceful', 'content')
    if (context.anticipation) triggered.push('hopeful', 'excited')

    return triggered.filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
  }

  /**
   * Select the dominant emotion from candidates
   * @param candidates Array of candidate emotions
   * @returns The dominant emotion
   */
  private selectDominantEmotion(candidates: HappyEmotion[]): HappyEmotion {
    if (candidates.length === 0) return 'content'
    if (candidates.length === 1) return candidates[0]

    // Emotion priority system
    const priorities: Record<HappyEmotion, number> = {
      excited: 10,
      joyful: 9,
      proud: 8,
      amused: 7,
      grateful: 6,
      hopeful: 5,
      content: 4,
      peaceful: 3
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
  private transitionToEmotion(newEmotion: HappyEmotion, triggers: HappyEmotion[]): void {
    const emotionData = this.happyEmotions[newEmotion]
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
    if (newEmotion !== this.currentHappyEmotion || Math.abs(this._intensity - newIntensity) > 0.1) {
      this.recordEmotionChange(newEmotion, triggers.map(t => t.toString()))
      this.currentHappyEmotion = newEmotion
      this.currentEmotion = newEmotion
    }
    
    this.lastUpdate = new Date()
  }

  /**
   * Get the color associated with the current emotion
   * @returns Color hex code
   */
  getEmotionColor(): string {
    return this.happyEmotions[this.currentHappyEmotion]?.color || '#FFFFFF'
  }

  /**
   * Get modifiers that this emotion applies to behavior
   * @returns Record of modifiers
   */
  getEmotionModifier(): Record<string, number> {
    const modifiers: Record<HappyEmotion, Record<string, number>> = {
      joyful: { energy: 1.3, creativity: 1.2, social: 1.2 },
      content: { patience: 1.2, focus: 1.1, stress: 0.8 },
      excited: { energy: 1.4, risk_taking: 1.2, creativity: 1.3 },
      grateful: { social: 1.3, generosity: 1.4, patience: 1.2 },
      amused: { creativity: 1.3, social: 1.2, stress: 0.7 },
      proud: { confidence: 1.4, persistence: 1.2, social: 1.1 },
      hopeful: { persistence: 1.3, optimism: 1.4, creativity: 1.1 },
      peaceful: { patience: 1.4, focus: 1.2, stress: 0.5 }
    }

    const baseModifiers = modifiers[this.currentHappyEmotion] || {}
    const scaledModifiers: Record<string, number> = {}
    
    // Scale modifiers by intensity
    for (const [key, value] of Object.entries(baseModifiers)) {
      const scaledValue = 1 + (value - 1) * this.intensity
      scaledModifiers[key] = scaledValue
    }
    
    return scaledModifiers
  }
}

// Factory function to create a happy emotion module
export function createHappyEmotionModule(config: EmotionConfig): HappyEmotionModule {
  return new HappyEmotionModule(config)
}