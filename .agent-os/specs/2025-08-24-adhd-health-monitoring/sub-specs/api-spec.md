# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-24-adhd-health-monitoring/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Enhanced Existing Endpoints

### GET /health (Enhanced)

**Purpose:** Basic health check enhanced with cognitive context awareness
**Parameters:** None
**Response:** Standard health response with ADHD cognitive context
**Errors:** 503 if core services down, 200 with warnings if degraded

Enhanced Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-08-24T15:30:00.000Z",
  "correlationId": "health-123",
  "cognitiveContext": {
    "medicationPhase": "wearing-off",
    "adaptiveMode": "simplified",
    "cognitiveLoad": "high"
  },
  "services": {
    "ollama": { "status": "healthy", "adaptedThresholds": true },
    "chromadb": { "status": "degraded", "priorityAdjusted": true },
    "filesystem": { "status": "healthy" }
  }
}
```

### GET /health/detailed (Enhanced)

**Purpose:** Comprehensive health information with predictive analysis
**Parameters:** None
**Response:** Detailed health metrics with ADHD-specific insights
**Errors:** 503 if critical services unavailable

## New ADHD-Specific Endpoints

### GET /health/adhd/status

**Purpose:** Current health status optimized for ADHD cognitive patterns
**Parameters:** None
**Response:** ADHD-friendly health summary with visual indicators
**Errors:** 500 if monitoring system fails

Example Response:

```json
{
  "status": "adapting",
  "visualIndicator": "🟡",
  "simpleMessage": "System is adjusting for afternoon productivity - everything working",
  "timestamp": "2025-08-24T15:30:00.000Z",
  "medicationContext": {
    "phase": "wearing-off",
    "timeUntilNext": "3.5 hours",
    "adaptationsActive": [
      "Increased retry attempts",
      "Simplified interface ready",
      "Priority processing enabled"
    ]
  },
  "serviceStates": {
    "voiceProcessing": {
      "status": "priority",
      "visualIndicator": "🟢",
      "message": "Voice capture working perfectly"
    },
    "semanticSearch": {
      "status": "adapted",
      "visualIndicator": "🟡",
      "message": "Search slightly slower but reliable"
    }
  }
}
```

### GET /health/adhd/prediction

**Purpose:** Predictive health analysis for proactive issue prevention
**Parameters:**

- `horizon` (optional): Prediction timeframe in minutes (default: 60)
  **Response:** Health predictions with actionable insights
  **Errors:** 400 if invalid horizon, 500 if prediction engine fails

Example Response:

```json
{
  "prediction": {
    "next15Minutes": {
      "overallHealth": 85,
      "expectedIssues": [],
      "confidence": 92
    },
    "next60Minutes": {
      "overallHealth": 72,
      "expectedIssues": [
        {
          "service": "ollama",
          "issue": "response_time_increase",
          "probability": 0.68,
          "suggestedAction": "Consider pre-warming service at 4:00 PM"
        }
      ],
      "confidence": 78
    }
  },
  "recommendations": [
    {
      "action": "Enable simplified mode at 4:00 PM",
      "reason": "Typical medication wear-off period approaching",
      "priority": "medium"
    }
  ]
}
```

### POST /health/adhd/medication/cycle

**Purpose:** Update medication cycle context for adaptive health monitoring
**Parameters:** Request body with medication timing information
**Response:** Updated adaptive configuration status
**Errors:** 400 if invalid medication data

Example Request:

```json
{
  "medicationTaken": "2025-08-24T08:00:00.000Z",
  "medicationType": "extended-release",
  "expectedDuration": 720,
  "notes": "feeling focused this morning"
}
```

### GET /health/adhd/adaptations

**Purpose:** Current adaptive configurations and their rationale
**Parameters:** None
**Response:** Active adaptations with cognitive context
**Errors:** 500 if adaptation system fails

Example Response:

```json
{
  "activeAdaptations": {
    "serviceThresholds": {
      "ollama": {
        "timeout": "reduced from 30s to 15s",
        "retries": "increased from 3 to 5",
        "reason": "medication wearing off detected"
      }
    },
    "interfaceSimplifications": [
      {
        "component": "search-results",
        "adaptation": "showing top 3 results instead of 10",
        "reason": "high cognitive load period"
      }
    ]
  },
  "nextReview": "2025-08-24T16:00:00.000Z"
}
```

## Real-time Health Streaming

### WebSocket /health/adhd/stream

**Purpose:** Real-time health updates for dashboard integration
**Connection:** WebSocket with optional cognitive context subscription
**Messages:** JSON health updates with ADHD-specific adaptations

Example Message:

```json
{
  "type": "health_update",
  "timestamp": "2025-08-24T15:32:00.000Z",
  "change": {
    "service": "chromadb",
    "metric": "response_time",
    "oldValue": 150,
    "newValue": 280,
    "adaptationTriggered": "increased_retries"
  },
  "cognitiveImpact": "minimal",
  "userNotification": "deferred"
}
```

## Error Handling

### ADHD-Friendly Error Response

```json
{
  "error": {
    "type": "HealthMonitoringError",
    "simpleMessage": "Health monitoring needs attention",
    "visualIndicator": "🔴",
    "cognitiveContext": {
      "currentPhase": "peak",
      "simplifyResponse": false
    },
    "immediateActions": [
      "System is safe to use for basic tasks",
      "Voice capture may be slower than usual",
      "Auto-recovery in progress"
    ],
    "technicalDetails": {
      "correlationId": "health-err-456",
      "timestamp": "2025-08-24T15:30:00.000Z",
      "affectedServices": ["ollama"],
      "estimatedRecovery": "5-10 minutes"
    }
  }
}
```

### Potential Error Codes

- **200 OK** - Healthy with possible adaptations active
- **202 Accepted** - Health check in progress, partial results
- **400 Bad Request** - Invalid medication cycle or prediction parameters
- **503 Service Unavailable** - Core ADHD functionality compromised
- **500 Internal Server Error** - Health monitoring system failure

## Integration with Existing Health System

### Enhanced Legacy Endpoints

All existing health endpoints (`/health/detailed`, `/health/quick`, `/health/ready`, `/health/live`) will be enhanced with:

- Optional `?adhd=true` parameter for ADHD-specific context
- Cognitive load indicators in responses
- Adaptive threshold information
- Medication cycle awareness in service status

### Backward Compatibility

- All existing health endpoints maintain current response format
- ADHD enhancements are additive (new fields, not replacement)
- Legacy clients continue working without modification
- New cognitive context is opt-in via query parameters

## Health Alert Integration

### POST /health/adhd/alerts/acknowledge

**Purpose:** Acknowledge health alerts to prevent notification fatigue
**Parameters:** Alert ID and user cognitive state
**Response:** Updated alert status and adaptation adjustments

### GET /health/adhd/alerts/summary

**Purpose:** Current health alerts formatted for ADHD cognitive patterns
**Response:** Simplified, prioritized alert summary with clear actions
