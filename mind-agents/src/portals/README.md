# Portals System

The Portals system provides a modular framework for integrating AI providers into the Symindx agent framework. Each portal acts as a bridge between the agent and a specific AI provider, offering a unified interface for text generation, chat completion, and embeddings.

## Architecture

```
src/portals/
├── index.ts              # Main exports and registry
├── base-portal.ts        # Base portal implementation
├── openai/
│   └── index.ts         # OpenAI portal
├── groq/
│   └── index.ts         # Groq portal
├── anthropic/
│   └── index.ts         # Anthropic portal
├── xai/
│   └── index.ts         # XAI portal
├── openrouter/
│   └── index.ts         # OpenRouter portal
└── kluster.ai/
    └── index.ts         # Kluster.ai portal
```

## Available Portals

### OpenAI Portal
- **Provider**: OpenAI
- **Models**: GPT-4.1, GPT-4o, GPT-4o-mini, o3
- **Features**: Text generation, chat completion, embeddings
- **AI SDK**: `@ai-sdk/openai`

### Groq Portal
- **Provider**: Groq
- **Models**: Llama 3.1 (405B, 70B, 8B), Mixtral, Gemma
- **Features**: Fast inference, text generation, chat completion
- **AI SDK**: `@ai-sdk/groq`
- **Note**: No embedding support

### Anthropic Portal
- **Provider**: Anthropic
- **Models**: Claude 3.5 Sonnet, Claude 3 Opus/Sonnet/Haiku
- **Features**: Advanced reasoning, text generation, chat completion
- **AI SDK**: `@ai-sdk/anthropic`
- **Note**: No embedding support

### XAI Portal
- **Provider**: XAI (Grok)
- **Models**: Grok Beta, Grok Vision Beta
- **Features**: Text generation, chat completion
- **Implementation**: Direct HTTP API calls
- **Note**: No embedding support

### OpenRouter Portal
- **Provider**: OpenRouter
- **Models**: Access to 100+ models from multiple providers
- **Features**: Text generation, chat completion, embeddings
- **Implementation**: Direct HTTP API calls
- **Special**: Cost tracking included

### Kluster.ai Portal
- **Provider**: Kluster.ai
- **Models**: Custom models
- **Features**: Text generation, chat completion, embeddings
- **Implementation**: Direct HTTP API calls

## Usage

### Basic Portal Creation

```typescript
import { createPortal } from '../portals'

// Create an OpenAI portal
const openaiPortal = createPortal('openai', {
  apiKey: 'your-openai-api-key',
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.7
})

// Generate text
const result = await openaiPortal.generateText('Hello, world!')
console.log(result.text)
```

### Agent Integration

```typescript
import { Agent, AgentConfig } from '../types/agent'
import { createPortal } from '../portals'

const agentConfig: AgentConfig = {
  core: {
    name: 'MyAgent',
    tone: 'friendly',
    personality: ['helpful', 'curious']
  },
  psyche: {
    traits: ['analytical'],
    defaults: {
      memory: 'supabase_pgvector',
      emotion: 'rune_emotion_stack',
      cognition: 'htn_planner',
      portal: 'openai'  // Specify which portal to use
    }
  },
  modules: {
    extensions: ['slack', 'twitter'],
    portal: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      maxTokens: 2000,
      temperature: 0.8
    }
  }
}
```

### Chat Completion

```typescript
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is the capital of France?' }
]

const response = await portal.generateChat(messages, {
  maxTokens: 500,
  temperature: 0.3
})

console.log(response.message.content)
```

### Streaming Responses

```typescript
for await (const chunk of portal.streamText('Tell me a story')) {
  process.stdout.write(chunk)
}
```

### Function Calling

```typescript
const functions = [{
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' }
    },
    required: ['location']
  }
}]

const response = await portal.generateChat(messages, {
  functions,
  maxTokens: 500
})
```

## Portal Registry

The `PortalRegistry` manages all available portals and provides factory methods:

```typescript
import { PortalRegistry } from '../portals'

const registry = PortalRegistry.getInstance()

// Get available portals
const available = registry.getAvailablePortals()
console.log(available) // ['openai', 'groq', 'anthropic', 'xai', 'openrouter', 'kluster.ai']

// Check if a portal is available
if (registry.isAvailable('openai')) {
  const portal = registry.create('openai', config)
}

// Get default configuration
const defaultConfig = registry.getDefaultConfig('groq')
```

## Environment Variables

Set up your API keys as environment variables:

```bash
# OpenAI
OPENAI_API_KEY=your_openai_key

# Groq
GROQ_API_KEY=your_groq_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key

# XAI
XAI_API_KEY=your_xai_key

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_key

# Kluster.ai
KLUSTER_AI_API_KEY=your_kluster_key
```

## Adding New Portals

To add a new AI provider:

1. Create a new folder in `src/portals/`
2. Implement the portal class extending `BasePortal`
3. Export factory function and default config
4. Register in `PortalRegistry`

```typescript
// src/portals/newprovider/index.ts
import { BasePortal } from '../base-portal.js'

export class NewProviderPortal extends BasePortal {
  constructor(config: NewProviderConfig) {
    super('newprovider', 'New Provider', '1.0.0', config)
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    // Implementation
  }

  // ... other required methods
}

export function createNewProviderPortal(config: NewProviderConfig): NewProviderPortal {
  return new NewProviderPortal(config)
}
```

## Error Handling

All portals implement consistent error handling:

```typescript
try {
  const result = await portal.generateText('Hello')
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Invalid API key')
  } else if (error.message.includes('rate limit')) {
    console.error('Rate limit exceeded')
  } else {
    console.error('Generation failed:', error.message)
  }
}
```

## Best Practices

1. **API Key Security**: Never hardcode API keys. Use environment variables.
2. **Error Handling**: Always wrap portal calls in try-catch blocks.
3. **Rate Limiting**: Implement rate limiting for production use.
4. **Model Selection**: Choose appropriate models based on your use case.
5. **Token Management**: Monitor token usage to control costs.
6. **Fallback Strategy**: Consider implementing fallback portals for reliability.

## Dependencies

The portals system requires these packages:

```json
{
  "dependencies": {
    "ai": "^3.4.0",
    "@ai-sdk/openai": "^0.0.66",
    "@ai-sdk/anthropic": "^0.0.50",
    "@ai-sdk/groq": "^0.0.56"
  }
}
```

Install with:
```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/groq
```