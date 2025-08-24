# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-24-adhd-health-monitoring/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Technical Requirements

### ADHD Health Monitor Architecture
- Create `ADHDHealthMonitor` class as central orchestrator for cognitive-aware health monitoring
- Implement `MedicationCycleTracker` for time-based phase detection (peak/wearing-off/baseline)
- Develop `CognitiveLoadAnalyzer` for real-time cognitive demand assessment
- Build `AdaptiveThresholdManager` for dynamic service configuration adjustment
- Design `ServicePriorityManager` for intelligent resource allocation during degraded states

### Enhanced Service Monitoring
- Extend existing service health checkers with comprehensive metrics collection
- Add P95 response time tracking for Ollama, ChromaDB, and filesystem operations
- Implement queue depth monitoring for voice processing pipeline
- Create resource utilization tracking (CPU, memory, disk I/O) per service
- Develop recent error pattern analysis with impact classification

### Predictive Health Analysis
- Build `CognitivePatternEngine` for learning daily performance cycles
- Implement 5-minute, 15-minute, and 60-minute availability prediction
- Create service degradation early warning system
- Develop pattern-based proactive scaling recommendations
- Design medication cycle correlation analysis for service performance

### Integration with Existing @orchestr8 Infrastructure
- Enhance circuit breakers with medication-cycle-aware threshold configurations
- Extend resilience policies with adaptive timeout and retry strategies
- Integrate structured logging with cognitive context in all health events
- Leverage existing correlation ID system for health event tracking

## Approach Options

**Option A: Extend Existing Health Middleware (Selected)**
- Pros: 
  - Leverages existing robust `enhanced-health.ts` implementation
  - Maintains compatibility with current health endpoints
  - Minimal disruption to existing monitoring infrastructure
  - Fast implementation building on proven foundation
- Cons: 
  - May require refactoring of existing health check logic
  - Could increase complexity of single middleware file

**Option B: Create Separate ADHD Health Service**
- Pros:
  - Clean separation of concerns
  - Easier to test ADHD-specific functionality
  - Independent deployment and scaling
- Cons:
  - Introduces additional service complexity
  - Potential duplication of existing health monitoring logic
  - Additional infrastructure overhead

**Rationale:** Option A aligns with the project's speed-over-perfection philosophy while building on the excellent existing foundation. The current `enhanced-health.ts` is well-architected and can be enhanced incrementally.

## External Dependencies

### New Package Dependencies
- **ml-regression** `^6.0.1` - Simple linear regression for pattern learning and prediction
  - Justification: Lightweight machine learning for cognitive pattern recognition
  - Alternative considered: TensorFlow.js (too heavy for local-first processing)

### Enhanced @orchestr8 Usage
- **@orchestr8/logger** - Extended with ADHD cognitive context logging
- **@orchestr8/resilience** - Enhanced circuit breakers with medication-cycle configurations
- **@orchestr8/schema** - Extended resilience policy types for adaptive thresholds

## Implementation Architecture

### ADHDHealthMonitor Core System
```typescript
interface ADHDHealthMonitor {
  // Cognitive context tracking
  medicationCycleTracker: MedicationCycleTracker;
  cognitiveLoadAnalyzer: CognitiveLoadAnalyzer;
  patternEngine: CognitivePatternEngine;
  
  // Adaptive monitoring
  thresholdManager: AdaptiveThresholdManager;
  priorityManager: ServicePriorityManager;
  
  // Enhanced service monitoring
  serviceMonitors: Map<string, EnhancedServiceMonitor>;
  
  // Predictive capabilities
  healthPredictor: HealthPredictor;
  alertingSystem: ADHDFriendlyAlerting;
}
```

### Medication Cycle Integration
```typescript
interface MedicationCyclePhase {
  phase: 'peak' | 'wearing-off' | 'baseline';
  confidence: number;
  timeRemaining: number;
  adaptiveThresholds: {
    responseTimeWarning: number;
    memoryUsageAlert: number;
    retryMultiplier: number;
    simplicityLevel: number;
  };
}
```

### Enhanced Health Endpoint Structure
- Extend existing `/health/*` endpoints with ADHD context
- Add new `/health/adhd/*` endpoints for cognitive-aware monitoring
- Implement real-time health streaming for dashboard integration
- Create medication cycle update endpoints

### Performance Optimization Strategy
```typescript
interface PerformanceConstraints {
  maxCpuUsage: 2; // Maximum 2% CPU overhead
  maxMemoryMB: 10; // Limit monitoring to 10MB memory
  adaptiveCheckFrequency: {
    critical: 5000;    // 5 seconds during wear-off
    normal: 30000;     // 30 seconds during peak
    background: 120000; // 2 minutes during stable
  };
}
```

### Service Priority Routing
- Implement dynamic service prioritization during degraded states
- Create graceful degradation strategies for non-critical services
- Design automatic interface simplification during high cognitive load
- Develop priority-based resource allocation algorithms

### Integration Points

#### Existing Health Middleware Enhancement
- Extend `performHealthCheck()` function with cognitive context
- Add medication cycle awareness to existing service health checkers
- Integrate adaptive threshold logic into circuit breaker configurations
- Enhance graceful shutdown with ADHD-aware connection handling

#### Logging and Monitoring Enhancement
```typescript
interface ADHDHealthLogContext {
  medicationPhase: MedicationCyclePhase;
  cognitiveLoad: CognitiveLoadLevel;
  adaptiveThresholds: AdaptiveThresholds;
  serviceStates: ServiceHealthStates;
  userActivityPattern: UserActivityPattern;
  healthPrediction: HealthPrediction;
}
```

#### Circuit Breaker Integration
- Enhance existing Ollama and ChromaDB circuit breakers
- Add medication-cycle-based failure threshold adjustment
- Implement cognitive-load-aware recovery strategies
- Create service-specific priority handling during failures