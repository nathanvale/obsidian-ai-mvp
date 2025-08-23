import { ProductionResilienceAdapter } from '@orchestr8/resilience';
import type { ResiliencePolicy } from '@orchestr8/schema';
import { config } from '../config/environment.js';
import { logger } from './logger.js';

export class ResilienceService {
  private static instance: ResilienceService;
  private adapter: ProductionResilienceAdapter;

  private constructor() {
    this.adapter = new ProductionResilienceAdapter();
    this.setupCircuitBreakerObserver();
  }

  public static getInstance(): ResilienceService {
    if (!ResilienceService.instance) {
      ResilienceService.instance = new ResilienceService();
    }
    return ResilienceService.instance;
  }

  private setupCircuitBreakerObserver(): void {
    this.adapter.circuitBreakerObserver((event) => {
      logger.warn({
        operationName: event.operationName,
        previousState: event.previousState,
        newState: event.newState,
        timestamp: event.timestamp,
        resilience: 'circuit-breaker-state-change',
      }, `Circuit breaker state changed: ${event.previousState} -> ${event.newState} for ${event.operationName}`);
    });
  }

  public async applyOllamaPolicy<T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    context?: {
      workflowId?: string;
      stepId?: string;
      correlationId?: string;
    }
  ): Promise<T> {
    return await this.adapter.applyNormalizedPolicy(
      operation,
      config.resilience.ollama,
      'retry-cb-timeout',
      signal,
      {
        workflowId: context?.workflowId || 'ollama-service',
        stepId: context?.stepId || 'operation',
        correlationId: context?.correlationId,
      }
    );
  }

  public async applyChromaDbPolicy<T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    context?: {
      workflowId?: string;
      stepId?: string;
      correlationId?: string;
    }
  ): Promise<T> {
    return await this.adapter.applyNormalizedPolicy(
      operation,
      config.resilience.chromadb,
      'retry-cb-timeout',
      signal,
      {
        workflowId: context?.workflowId || 'chromadb-service',
        stepId: context?.stepId || 'operation',
        correlationId: context?.correlationId,
      }
    );
  }

  public async applyFileSystemPolicy<T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    context?: {
      workflowId?: string;
      stepId?: string;
      correlationId?: string;
    }
  ): Promise<T> {
    return await this.adapter.applyNormalizedPolicy(
      operation,
      config.resilience.filesystem,
      'retry-cb-timeout',
      signal,
      {
        workflowId: context?.workflowId || 'filesystem-service',
        stepId: context?.stepId || 'operation',
        correlationId: context?.correlationId,
      }
    );
  }

  public async applyCustomPolicy<T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    policy: ResiliencePolicy,
    compositionOrder: string = 'retry-cb-timeout',
    signal?: AbortSignal,
    context?: {
      workflowId?: string;
      stepId?: string;
      correlationId?: string;
    }
  ): Promise<T> {
    return await this.adapter.applyNormalizedPolicy(
      operation,
      policy,
      compositionOrder,
      signal,
      context
    );
  }

  public getCircuitBreakerStates(): Record<string, any> {
    // This would typically return actual circuit breaker states
    // For now, return a placeholder structure
    return {
      ollama: { state: 'closed', failureCount: 0 },
      chromadb: { state: 'closed', failureCount: 0 },
      filesystem: { state: 'closed', failureCount: 0 },
    };
  }

  public async dispose(): Promise<void> {
    if (this.adapter) {
      await this.adapter.dispose();
    }
  }
}

export const resilienceService = ResilienceService.getInstance();