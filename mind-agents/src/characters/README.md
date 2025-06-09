# SYMindX Characters

This directory contains configuration files for SYMindX agents. Each agent is defined by a JSON file with the following structure:

## Character Configuration

```json
{
  "id": "agent_id",
  "core": { 
    "name": "Agent Name", 
    "tone": "Description of agent's tone and personality",
    "personality": ["trait1", "trait2", "trait3"]
  },
  "lore": { 
    "origin": "Character backstory", 
    "motive": "Character motivation",
    "background": "Detailed character background"
  },
  "psyche": {
    "traits": ["trait1", "trait2", "trait3"],
    "defaults": {
      "memory": "memory_provider_id",
      "emotion": "emotion_module_id",
      "cognition": "cognition_module_id",
      "portal": "portal_id"
    }
  },
  "modules": { 
    "extensions": ["extension1", "extension2"],
    "memory": {
      "provider": "sqlite",
      "maxRecords": 1000,
      "embeddingModel": "text-embedding-3-small",
      "retentionDays": 30
    },
    "emotion": {
      "type": "rune_emotion_stack",
      "sensitivity": 0.7,
      "decayRate": 0.1,
      "transitionSpeed": 0.5
    },
    "cognition": {
      "type": "htn_planner",
      "planningDepth": 3,
      "maxGoals": 5,
      "creativityFactor": 0.8
    },
    "portal": {
      "type": "openai",
      "model": "gpt-4",
      "temperature": 0.7,
      "maxTokens": 1000
    }
  }
}
```

### Configuration Options

#### Core

- `id`: Unique identifier for the agent
- `core.name`: Display name of the agent
- `core.tone`: Brief description of the agent's tone and personality
- `core.personality`: Array of personality descriptors

#### Lore

- `lore.origin`: Character backstory or origin
- `lore.motive`: Character's primary motivation
- `lore.background`: Detailed character background

#### Psyche

- `psyche.traits`: Array of personality traits
- `psyche.defaults.memory`: ID of the memory provider to use (e.g., "sqlite", "supabase_pgvector")
- `psyche.defaults.emotion`: ID of the emotion module to use (e.g., "rune_emotion_stack")
- `psyche.defaults.cognition`: ID of the cognition module to use (e.g., "htn_planner", "reactive", "hybrid")
- `psyche.defaults.portal`: ID of the AI portal to use (e.g., "openai", "anthropic", "groq")

#### Modules

- `modules.extensions`: Array of extension IDs to enable for this agent
- `modules.memory`: Memory provider configuration
- `modules.emotion`: Emotion module configuration
- `modules.cognition`: Cognition module configuration
- `modules.portal`: Portal configuration

## Available Providers

### Memory Providers
- `sqlite`: SQLite-based memory storage
- `supabase_pgvector`: Supabase with pgvector for embeddings
- `memory`: In-memory storage (non-persistent)

### Emotion Modules
- `rune_emotion_stack`: RuneScape-inspired emotion system

### Cognition Modules
- `htn_planner`: Hierarchical Task Network planner
- `reactive`: Simple reactive cognition
- `hybrid`: Combination of HTN and reactive

### Portals
- `openai`: OpenAI GPT models
- `anthropic`: Anthropic Claude models
- `groq`: Groq models
- `xai`: xAI Grok models
- `openrouter`: OpenRouter API
- `kluster.ai`: Kluster.ai models

## Example Characters

- `nyx.json`: A chaotic-empath hacker character

## Creating a New Character

To create a new character:

1. Create a new JSON file in this directory with a descriptive name (e.g., `your_character.json`)
2. Define the character's configuration using the structure above
3. Restart the SYMindX runtime or use the API to load the new character

The SYMindX runtime will automatically load all character configurations from this directory on startup.