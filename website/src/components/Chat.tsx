import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Send, Bot, User, Loader2 } from 'lucide-react'

interface Message {
  id: string
  content: string
  sender: 'user' | 'agent'
  timestamp: Date
  agentId?: string
}

interface Agent {
  id: string
  name: string
  status: 'active' | 'idle' | 'thinking' | 'paused' | 'error'
  emotion: string
}

interface ChatProps {
  agents: Agent[]
  selectedAgent: string
  onAgentSelect: (agentId: string) => void
}

export function Chat({ agents, selectedAgent, onAgentSelect }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history when agent changes
  useEffect(() => {
    if (selectedAgent) {
      loadChatHistory(selectedAgent)
    }
  }, [selectedAgent])

  const loadChatHistory = async (agentId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/chat/history/${agentId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.messages) {
          const formattedMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id || Date.now().toString(),
            content: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
            agentId: msg.agentId
          }))
          setMessages(formattedMessages)
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:3000/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId: selectedAgent,
          message: userMessage.content,
          timestamp: userMessage.timestamp.toISOString()
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.response) {
          const agentMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data.response,
            sender: 'agent',
            timestamp: new Date(),
            agentId: selectedAgent
          }
          setMessages(prev => [...prev, agentMessage])
        }
      } else {
        // Fallback response if API fails
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "I'm currently processing your message. Please check that the SYMindX runtime is running and the agent is active.",
          sender: 'agent',
          timestamp: new Date(),
          agentId: selectedAgent
        }
        setMessages(prev => [...prev, fallbackMessage])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting right now. Please make sure the SYMindX runtime is running.",
        sender: 'agent',
        timestamp: new Date(),
        agentId: selectedAgent
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent)

  return (
    <div className="space-y-6">
      {/* Agent Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Chat with Agent</span>
          </CardTitle>
          <CardDescription>
            Select an agent to start a conversation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Select value={selectedAgent} onValueChange={onAgentSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent to chat with" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center space-x-2">
                          <span>{agent.name}</span>
                          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                            {agent.status}
                          </Badge>
                          <Badge variant="outline">{agent.emotion}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedAgentData && (
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4" />
                  <span className="font-medium">{selectedAgentData.name}</span>
                  <Badge variant={selectedAgentData.status === 'active' ? 'default' : 'secondary'}>
                    {selectedAgentData.status}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      {selectedAgent && (
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span>Conversation with {selectedAgentData?.name}</span>
              {selectedAgentData && (
                <Badge variant={selectedAgentData.status === 'active' ? 'default' : 'secondary'}>
                  {selectedAgentData.status}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          
          {/* Messages */}
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start a conversation with {selectedAgentData?.name}</p>
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className={`flex-1 max-w-[80%] ${
                      message.sender === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block p-3 rounded-lg bg-muted text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="flex-shrink-0 flex items-center space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${selectedAgentData?.name}...`}
                disabled={isLoading || selectedAgentData?.status !== 'active'}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!inputMessage.trim() || isLoading || selectedAgentData?.status !== 'active'}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {selectedAgentData?.status !== 'active' && (
              <div className="text-center text-sm text-muted-foreground mt-2">
                Agent is {selectedAgentData?.status}. Activate the agent to start chatting.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Chat