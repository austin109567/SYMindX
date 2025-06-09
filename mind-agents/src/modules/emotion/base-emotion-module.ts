/**
 * Base Emotion Module for SYMindX
 * 
 * This provides a common base implementation for all emotion modules
 */

import { EmotionState, EmotionRecord, EmotionConfig } from '../../types/agent.js'
import { EmotionModule, EmotionModuleMetadata } from '../../types/emotion.js'
import { Context } from '../../types/common'

/**
 * Abstract base class for all emotion modules
 */
export abstract class BaseEmotionModule implements EmotionModule {
  protected config: EmotionConfig
  protected emotionHistory: EmotionRecord[] = []
  protected currentEmotion: string = 'neutral'
  protected _intensity: number = 0.0
  protected lastUpdate: Date = new Date()
  protected metadata: EmotionModuleMetadata

  /**
   * Get the current emotion string
   */
  get current(): string {
    return this.currentEmotion
  }

  /**
   * Get the current emotion intensity
   */
  get intensity(): number {
    return this._intensity
  }

  constructor(config: EmotionConfig, metadata: EmotionModuleMetadata) {
    this.config = config
    this.metadata = metadata
  }

  /**
   * Process an event and update the emotion state
   * @param eventType The type of event that occurred
   * @param context Additional context about the event
   * @returns The updated emotion state
   */
  abstract processEvent(eventType: string, context?: Context): EmotionState

  /**
   * Get the current emotion state
   * @returns The current emotion state
   */
  getCurrentState(): EmotionState {
    return {
      current: this.currentEmotion,
      intensity: this._intensity,
      triggers: [],  // Subclasses should override this
      history: [...this.emotionHistory],
      timestamp: new Date()
    }
  }

  /**
   * Get the current emotion
   * @returns The current emotion string
   */
  getCurrentEmotion(): string {
    return this.currentEmotion;
  }

  /**
   * Update the emotion state directly
   * @param emotion The emotion to set
   * @param intensity The intensity of the emotion (0.0 to 1.0)
   * @param triggers What triggered this emotion
   * @returns The updated emotion state
   */
  setEmotion(emotion: string, intensity: number, triggers: string[] = []): EmotionState {
    this.recordEmotionChange(emotion, triggers)
    this.currentEmotion = emotion
    this._intensity = Math.max(0, Math.min(1, intensity))
    this.lastUpdate = new Date()
    return this.getCurrentState()
  }

  /**
   * Get the emotion history
   * @param limit Maximum number of records to return
   * @returns Array of emotion records
   */
  getHistory(limit: number = 10): EmotionRecord[] {
    return this.emotionHistory.slice(-limit)
  }

  /**
   * Reset the emotion state to neutral
   * @returns The updated emotion state
   */
  reset(): EmotionState {
    this.currentEmotion = 'neutral'
    this._intensity = 0.0
    this.emotionHistory = []
    this.lastUpdate = new Date()
    return this.getCurrentState()
  }

  /**
   * Record an emotion change in the history
   * @param emotion The emotion that was triggered
   * @param triggers What triggered this emotion
   */
  protected recordEmotionChange(emotion: string, triggers: string[]): void {
    const record: EmotionRecord = {
      emotion,
      intensity: this._intensity,
      timestamp: new Date(),
      triggers: triggers,
      duration: 0 // Will be calculated when emotion changes again
    }
    
    // Update duration of previous emotion
    if (this.emotionHistory.length > 0) {
      const lastRecord = this.emotionHistory[this.emotionHistory.length - 1]
      lastRecord.duration = record.timestamp.getTime() - lastRecord.timestamp.getTime()
    }
    
    this.emotionHistory.push(record)
    
    // Keep only recent history
    if (this.emotionHistory.length > 100) {
      this.emotionHistory = this.emotionHistory.slice(-50)
    }
  }

  /**
   * Decay the current emotion over time
   */
  protected decayCurrentEmotion(): void {
    const timeSinceUpdate = Date.now() - this.lastUpdate.getTime()
    const decayAmount = (timeSinceUpdate / 1000) * this.config.decayRate
    
    this._intensity = Math.max(0, this._intensity - decayAmount)
    
    // Return to neutral if intensity is very low
    if (this._intensity < 0.1 && this.currentEmotion !== 'neutral') {
      this.currentEmotion = 'neutral'
      this._intensity = 0
    }
    
    this.lastUpdate = new Date()
  }

  /**
   * Get the metadata for this emotion module
   */
  getMetadata(): EmotionModuleMetadata {
    return this.metadata
  }
}