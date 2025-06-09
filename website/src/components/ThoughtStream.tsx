import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Clock, RefreshCw } from 'lucide-react'

interface Thought {
  id: string
  timestamp: Date
  type: 'thought' | 'plan' | 'memory' | 'emotion' | 'action'
  content: string
  metadata?: Record<string, any>
}

interface ThoughtStreamProps {
  agentId: string
}

export default function ThoughtStream({ agentId }: ThoughtStreamProps) {
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [loading, setLoading] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new thoughts arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thoughts])

  // Fetch recent thoughts from API
  useEffect(() => {
    const fetchThoughts = async () => {
      if (!agentId) return
      
      setLoading(true)
      try {
        const response = await fetch(`http://localhost:3000/memory/recent?limit=20&agentId=${agentId}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.memories) {
            const thoughtData: Thought[] = data.memories.map((memory: any) => ({
              id: memory.id || Date.now().toString(),
              timestamp: new Date(memory.timestamp || Date.now()),
              type: memory.type || 'thought',
              content: memory.content || memory.text || 'No content',
              metadata: memory.metadata || {}
            }))
            setThoughts(thoughtData)
          }
        }
      } catch (error) {
        console.error('Failed to fetch thoughts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchThoughts()
    const interval = setInterval(fetchThoughts, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [agentId])

  const getTypeColor = (type: Thought['type']) => {
    switch (type) {
      case 'thought': return 'bg-blue-100 text-blue-800'
      case 'plan': return 'bg-purple-100 text-purple-800'
      case 'memory': return 'bg-green-100 text-green-800'
      case 'emotion': return 'bg-orange-100 text-orange-800'
      case 'action': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: Thought['type']) => {
    switch (type) {
      case 'thought': return '💭'
      case 'plan': return '📋'
      case 'memory': return '🧠'
      case 'emotion': return '❤️'
      case 'action': return '⚡'
      default: return '💫'
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>Thought Stream</span>
          {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
        </CardTitle>
        <CardDescription>
          Real-time cognitive process monitoring for {agentId || 'selected agent'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto space-y-3 pr-2"
        >
          {thoughts.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No thoughts available
            </div>
          )}
          {thoughts.map((thought) => (
            <div key={thought.id} className="flex space-x-3 p-3 rounded-lg bg-muted/50">
              <div className="text-lg">{getTypeIcon(thought.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge className={getTypeColor(thought.type)}>
                    {thought.type}
                  </Badge>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{thought.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
                <p className="text-sm">{thought.content}</p>
                {thought.metadata && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(thought.metadata).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}