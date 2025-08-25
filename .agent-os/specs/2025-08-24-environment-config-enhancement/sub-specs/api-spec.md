# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-24-environment-config-enhancement/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Endpoints

### GET /config/validate

**Purpose:** Real-time configuration validation and health status
**Parameters:** None
**Response:** Complete configuration validation results with ADHD-friendly error messages
**Errors:** 500 if validation system fails

Example Response:

```json
{
  "status": "valid",
  "timestamp": "2025-08-24T22:30:00.000Z",
  "correlationId": "cfg-val-123",
  "validationResults": {
    "schema": { "status": "valid", "errors": [] },
    "services": {
      "status": "partial",
      "errors": [
        {
          "field": "OLLAMA_URL",
          "message": "Cannot connect to Ollama service at http://localhost:11434",
          "suggestion": "Check if Ollama is running with: ollama serve",
          "severity": "error"
        }
      ]
    },
    "filesystem": { "status": "valid", "errors": [] }
  },
  "profile": "development",
  "configSource": ".env.local"
}
```

### POST /config/reload

**Purpose:** Hot reload configuration from environment files
**Parameters:** None  
**Response:** Reload status and validation results
**Errors:** 400 if new configuration invalid, 500 if reload fails

Example Response:

```json
{
  "status": "success",
  "timestamp": "2025-08-24T22:30:00.000Z",
  "correlationId": "cfg-reload-456",
  "changes": [
    {
      "field": "OLLAMA_MODEL",
      "oldValue": "nomic-embed-text",
      "newValue": "all-minilm",
      "action": "updated"
    }
  ],
  "validationResults": {
    "status": "valid",
    "errors": []
  }
}
```

### GET /config/profiles

**Purpose:** List available environment profiles
**Parameters:** None
**Response:** Available profiles with descriptions
**Errors:** 500 if profile system fails

Example Response:

```json
{
  "status": "success",
  "profiles": [
    {
      "name": "development",
      "description": "Local development with debug logging",
      "active": true
    },
    {
      "name": "test",
      "description": "Testing environment with mock services",
      "active": false
    },
    {
      "name": "production",
      "description": "Production deployment configuration",
      "active": false
    }
  ]
}
```

### POST /config/profiles/{profileName}/apply

**Purpose:** Apply a specific environment profile
**Parameters:** profileName (path parameter)
**Response:** Profile application status and validation results
**Errors:** 404 if profile not found, 400 if profile invalid

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "type": "ConfigurationValidationError",
    "message": "Configuration validation failed",
    "correlationId": "cfg-err-789",
    "timestamp": "2025-08-24T22:30:00.000Z",
    "details": [
      {
        "field": "OBSIDIAN_VAULT_PATH",
        "message": "Directory does not exist: /nonexistent/path",
        "suggestion": "Create the directory or update OBSIDIAN_VAULT_PATH to point to your Obsidian vault",
        "severity": "error"
      }
    ]
  }
}
```

### Potential Error Codes

- **400 Bad Request** - Invalid configuration data or parameters
- **404 Not Found** - Profile or configuration resource not found
- **500 Internal Server Error** - Configuration system failure
- **503 Service Unavailable** - Configuration reload in progress

## Configuration Health Integration

### Enhanced Health Check Response

The existing `/health` endpoint will include configuration validation status:

```json
{
  "status": "healthy",
  "timestamp": "2025-08-24T22:30:00.000Z",
  "services": {
    "configuration": {
      "status": "healthy",
      "lastValidated": "2025-08-24T22:29:45.000Z",
      "profile": "development",
      "validationErrors": 0
    },
    "ollama": { "status": "healthy" },
    "chromadb": { "status": "healthy" }
  }
}
```

## Controllers

### ConfigurationController

**Purpose:** Handle all configuration-related API endpoints
**Methods:**

- `validateConfiguration()` - GET /config/validate
- `reloadConfiguration()` - POST /config/reload
- `listProfiles()` - GET /config/profiles
- `applyProfile(profileName)` - POST /config/profiles/{profileName}/apply

**Dependencies:**

- ConfigValidator service for validation logic
- ConfigReloadManager for hot reload functionality
- ProfileManager for profile management
- Logger with correlation ID support
