import { ProductionResilienceAdapter } from '@orchestr8/resilience';
import type { ResiliencePolicy, CompositionOrder, ResilienceInvocationContext } from '@orchestr8/schema';
import { config } from '../config/environment.js';
import { logger } from './logger.js';

export class ResilienceService {
  private static instance: ResilienceService;
  private adapter: ProductionResilienceAdapter;

  private constructor() {
    this.adapter = new ProductionResilienceAdapter();
    
    // Set up logging for circuit breaker events if available
    // Note: The exact API for circuit breaker observers may need adjustment based on @orchestr8/resilience documentation
  }

  public static getInstance(): ResilienceService {
    if (!ResilienceService.instance) {
      ResilienceService.instance = new ResilienceService();
    }
    return ResilienceService.instance;
  }

  public async applyOllamaPolicy<T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    context?: Partial<ResilienceInvocationContext>
  ): Promise<T> {
    const invocationContext: ResilienceInvocationContext = {
      workflowId: context?.workflowId || 'ollama-service',
      stepId: context?.stepId || 'operation',
      correlationId: context?.correlationId,
    };

    return await this.adapter.applyNormalizedPolicy(
      operation,
      config.resilience.ollama,
      'retry-cb-timeout',
      signal,
      invocationContext
    );
  }

  public async applyChromaDbPolicy<T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    context?: Partial<ResilienceInvocationContext>
  ): Promise<T> {
    const invocationContext: ResilienceInvocationContext = {
      workflowId: context?.workflowId || 'chromadb-service',
      stepId: context?.stepId || 'operation',
      correlationId: context?.correlationId,
    };

    return await this.adapter.applyNormalizedPolicy(
      operation,
      config.resilience.chromadb,
      'retry-cb-timeout',
      signal,
      invocationContext
    );
  }

  public async applyFileSystemPolicy<T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    context?: Partial<ResilienceInvocationContext>
  ): Promise<T> {
    const invocationContext: ResilienceInvocationContext = {
      workflowId: context?.workflowId || 'filesystem-service',
      stepId: context?.stepId || 'operation',
      correlationId: context?.correlationId,
    };

    return await this.adapter.applyNormalizedPolicy(
      operation,
      config.resilience.filesystem,
      'retry-cb-timeout',
      signal,
      invocationContext
    );
  }

  public async applyCustomPolicy<T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    policy: ResiliencePolicy,
    compositionOrder: CompositionOrder = 'retry-cb-timeout',
    signal?: AbortSignal,
    context?: Partial<ResilienceInvocationContext>
  ): Promise<T> {
    const invocationContext: ResilienceInvocationContext | undefined = context ? {
      workflowId: context.workflowId || 'custom-operation',
      stepId: context.stepId || 'operation',
      correlationId: context.correlationId,
    } : undefined;

    return await this.adapter.applyNormalizedPolicy(
      operation,
      policy,
      compositionOrder,
      signal,
      invocationContext
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

  public dispose(): void {
    // ProductionResilienceAdapter doesn't have a dispose method
    // Circuit breakers clean up automatically
  }
}

export const resilienceService = ResilienceService.getInstance();