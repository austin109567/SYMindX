import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, TrendingUp, Activity, RefreshCw } from 'lucide-react'

interface EmotionState {
  emotion: string
  intensity: number
  timestamp: Date
  triggers: string[]
}

interface EmotionGraphProps {
  agentId: string
}

// RuneScape-inspired emotions
const EMOTIONS = [
  { name: 'focused', color: 'bg-blue-500', description: 'Deep concentration on tasks' },
  { name: 'excited', color: 'bg-yellow-500', description: 'High energy and enthusiasm' },
  { name: 'frustrated', color: 'bg-red-500', description: 'Encountering obstacles' },
  { name: 'curious', color: 'bg-purple-500', description: 'Exploring new possibilities' },
  { name: 'satisfied', color: 'bg-green-500', description: 'Achievement and progress' },
  { name: 'anxious', color: 'bg-orange-500', description: 'Uncertainty about outcomes' },
  { name: 'determined', color: 'bg-indigo-500', description: 'Strong resolve to succeed' },
  { name: 'playful', color: 'bg-pink-500', description: 'Enjoying the experience' }
]

export default function EmotionGraph({ agentId }: EmotionGraphProps) {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState>({
    emotion: 'neutral',
    intensity: 0.5,
    timestamp: new Date(),
    triggers: []
  })
  
  const [emotionHistory, setEmotionHistory] = useState<EmotionState[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch emotion data from API
  useEffect(() => {
    const fetchEmotionData = async () => {
      if (!agentId) return
      
      setLoading(true)
      try {
        const response = await fetch(`http://localhost:3000/status`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.agents) {
            const agent = data.agents.find((a: any) => a.id === agentId)
            if (agent && agent.emotion) {
              const emotionData: EmotionState = {
                emotion: agent.emotion.current || 'neutral',
                intensity: agent.emotion.intensity || 0.5,
                timestamp: new Date(agent.emotion.lastUpdate || Date.now()),
                triggers: agent.emotion.triggers || []
              }
              setCurrentEmotion(emotionData)
              
              // Add to history if it's a new emotion
              setEmotionHistory(prev => {
                const lastEmotion = prev[prev.length - 1]
                if (!lastEmotion || lastEmotion.emotion !== emotionData.emotion || 
                    Math.abs(lastEmotion.intensity - emotionData.intensity) > 0.1) {
                  return [...prev.slice(-10), emotionData]
                }
                return prev
              })
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch emotion data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEmotionData()
    const interval = setInterval(fetchEmotionData, 3000) // Refresh every 3 seconds
    return () => clearInterval(interval)
  }, [agentId])

  const getEmotionConfig = (emotionName: string) => {
    return EMOTIONS.find(e => e.name === emotionName) || EMOTIONS[0]
  }

  const getIntensityLabel = (intensity: number) => {
    if (intensity >= 0.8) return 'Very High'
    if (intensity >= 0.6) return 'High'
    if (intensity >= 0.4) return 'Medium'
    return 'Low'
  }

  return (
    <div className="space-y-6">
      {/* Current Emotion Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>Current Emotional State</span>
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Real-time emotion monitoring for {agentId || 'selected agent'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div 
                  className={`w-8 h-8 rounded-full ${getEmotionConfig(currentEmotion.emotion).color}`}
                />
                <div>
                  <h3 className="text-2xl font-bold capitalize">{currentEmotion.emotion}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getEmotionConfig(currentEmotion.emotion).description}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Intensity</span>
                  <span>{getIntensityLabel(currentEmotion.intensity)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getEmotionConfig(currentEmotion.emotion).color}`}
                    style={{ width: `${currentEmotion.intensity * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Triggers:</p>
                <div className="flex flex-wrap gap-1">
                  {currentEmotion.triggers.map((trigger, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {trigger.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Emotion Intensity Gauge */}
            <div className="flex flex-col items-center space-y-2">
              <Activity className="h-6 w-6 text-muted-foreground" />
              <div className="text-3xl font-bold">
                {Math.round(currentEmotion.intensity * 100)}%
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Emotional<br />Intensity
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emotion History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Emotion Timeline</span>
          </CardTitle>
          <CardDescription>
            Recent emotional state changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emotionHistory.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No emotion history available
              </div>
            )}
            {emotionHistory.slice(-8).reverse().map((emotion, index) => {
              const config = getEmotionConfig(emotion.emotion)
              return (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                  <div className={`w-4 h-4 rounded-full ${config.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{emotion.emotion}</span>
                      <span className="text-xs text-muted-foreground">
                        {emotion.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-20 bg-muted rounded-full h-1">
                        <div 
                          className={`h-1 rounded-full ${config.color}`}
                          style={{ width: `${emotion.intensity * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(emotion.intensity * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Emotion Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Emotion Types</CardTitle>
          <CardDescription>
            Available emotional states in the RuneScape emotion system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {EMOTIONS.map((emotion) => (
              <div key={emotion.name} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/20">
                <div className={`w-3 h-3 rounded-full ${emotion.color}`} />
                <div>
                  <div className="font-medium capitalize">{emotion.name}</div>
                  <div className="text-xs text-muted-foreground">{emotion.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}